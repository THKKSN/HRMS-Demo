using Hangfire;
using Hrms.Application.Common.Helpers;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Localization;
using Hrms.Application.Common.Notifications;
using Hrms.Domain.Enums;
using Hrms.Infrastructure.Persistence;
using Hrms.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Hrms.Infrastructure.Jobs;

[DisableConcurrentExecution(timeoutInSeconds: 300)]
public class NotificationDeliveryJob(
    HrmsDbContext db,
    ILineMessagingService line,
    INotificationTemplateCatalog templates,
    ILogger<NotificationDeliveryJob> logger)
{
    private const int MaxAttempts = 5;
    private const int BatchSize = 50;

    public async Task ProcessAsync(CancellationToken ct = default)
    {
        var now = DateTime.UtcNow.AddHours(7);
        var staleBefore = now.AddMinutes(-10);
        await db.NotificationOutboxes
            .Where(x => x.Status == NotificationDeliveryStatus.Processing &&
                x.ProcessingStartedAt < staleBefore)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(x => x.Status, NotificationDeliveryStatus.Failed)
                .SetProperty(x => x.NextAttemptAt, now)
                .SetProperty(x => x.ProcessingStartedAt, (DateTime?)null)
                .SetProperty(x => x.LastError, "Recovered stale delivery lock"), ct);

        // สร้างใหม่ทุกรอบ — ภาษาที่ผู้ใช้เปลี่ยนระหว่างวันต้องมีผลกับรอบถัดไปทันที
        var locales = new RecipientLocaleResolver(db);

        var ids = await db.NotificationOutboxes.AsNoTracking()
            .Where(x => (x.Status == NotificationDeliveryStatus.Pending ||
                    x.Status == NotificationDeliveryStatus.Failed) &&
                (!x.NextAttemptAt.HasValue || x.NextAttemptAt <= now))
            .OrderBy(x => x.CreatedAt)
            .Select(x => x.Id)
            .Take(BatchSize)
            .ToListAsync(ct);

        foreach (var id in ids)
        {
            ct.ThrowIfCancellationRequested();
            var claimed = await db.NotificationOutboxes
                .Where(x => x.Id == id &&
                    (x.Status == NotificationDeliveryStatus.Pending ||
                     x.Status == NotificationDeliveryStatus.Failed) &&
                    (!x.NextAttemptAt.HasValue || x.NextAttemptAt <= now))
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(x => x.Status, NotificationDeliveryStatus.Processing)
                    .SetProperty(x => x.ProcessingStartedAt, now), ct);
            if (claimed == 0) continue;

            var delivery = await db.NotificationOutboxes.FirstAsync(x => x.Id == id, ct);
            try
            {
                var payload = NotificationPayload.FromJson(delivery.PayloadJson)
                    ?? throw new InvalidOperationException("Notification payload is empty.");
                var locale = await locales.ResolveAsync(delivery, ct);
                var text = new MessageText(templates, locale);
                var message = ResolveMessage(payload, locale);
                // Memo กับ Ticket ใช้การ์ดโครงเดียวกัน แต่ deep link และป้าย header ต่างกัน
                var isMemo = string.Equals(delivery.EntityType, "Memo", StringComparison.OrdinalIgnoreCase);
                var detailUrl = line.BuildLiffUri(isMemo
                    ? $"/memos/{delivery.EntityId}"
                    : $"/tickets/{delivery.EntityId}");
                var card = LineFlexBuilder.BuildTicketNotificationCard(
                    message, detailUrl, delivery.EventType, text, isMemo ? "MEMO" : "INTERNAL TICKET");
                await line.PushFlexMessageAsync(
                    delivery.LineUserId, TitleFrom(message, text), card, ct);
                delivery.Status = NotificationDeliveryStatus.Sent;
                delivery.SentAt = DateTime.UtcNow.AddHours(7);
                delivery.ProcessingStartedAt = null;
                delivery.NextAttemptAt = null;
                delivery.LastError = null;
                delivery.AttemptCount++;
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                delivery.AttemptCount++;
                delivery.ProcessingStartedAt = null;
                delivery.LastError = Truncate(ex.GetBaseException().Message, 2000);
                if (delivery.AttemptCount >= MaxAttempts)
                {
                    delivery.Status = NotificationDeliveryStatus.DeadLetter;
                    delivery.NextAttemptAt = null;
                    logger.LogError(ex,
                        "Notification {NotificationId} moved to dead letter", delivery.Id);
                }
                else
                {
                    delivery.Status = NotificationDeliveryStatus.Failed;
                    delivery.NextAttemptAt = DateTime.UtcNow.AddHours(7)
                        .AddMinutes(Math.Pow(2, delivery.AttemptCount - 1));
                    logger.LogWarning(ex,
                        "Notification {NotificationId} failed; retry scheduled", delivery.Id);
                }
            }
            await db.SaveChangesAsync(ct);
            db.ChangeTracker.Clear();
        }
    }

    /// <summary>
    /// ประกอบข้อความจาก payload — รูปใหม่ประกอบจากเทมเพลตตอนนี้ ส่วนรูปเก่าใช้ข้อความที่เก็บไว้ตรง ๆ
    ///
    /// <para>
    /// ภาษามาจาก <c>PreferredLanguage</c> ของผู้รับ (ไม่ใช่ของคนที่กดปุ่ม) ผ่าน
    /// <see cref="RecipientLocaleResolver"/> — คิวเก่าที่ยังเป็นรูป <c>{ Message }</c> ไม่เกี่ยวกับภาษา
    /// เพราะข้อความถูกประกอบไว้ตั้งแต่ตอน queue แล้ว
    /// </para>
    /// <para>
    /// เทมเพลตหายต้องไม่ทำให้ส่งไม่ออก — ตกไปใช้ <c>Message</c> เดิมถ้ามี ไม่มีก็ใช้ key เปล่า ๆ
    /// ให้เห็นบนหน้าจอว่าคีย์ไหนขาด (เจอเร็วกว่ารอ log)
    /// </para>
    /// </summary>
    private string ResolveMessage(NotificationPayload payload, string locale)
    {
        if (string.IsNullOrWhiteSpace(payload.TemplateKey))
            return payload.Message ?? string.Empty;

        var template = templates.Find(payload.TemplateKey, locale);
        if (template is null)
        {
            logger.LogWarning(
                "Notification template {TemplateKey} not found for locale {Locale}",
                payload.TemplateKey, locale);
            return payload.Message ?? payload.TemplateKey;
        }
        return NotificationTemplate.Render(
            template, payload.ResolveParams(locale, key => templates.Find(key, locale)));
    }

    /// <summary><c>altText</c> ของ LINE — บรรทัดแรกของข้อความ ซึ่งแปลมาแล้วตามภาษาผู้รับ</summary>
    private static string TitleFrom(string message, MessageText text)
        => message.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .FirstOrDefault() ?? text.Of("card.fallbackTitle");

    private static string Truncate(string value, int maxLength)
        => value.Length <= maxLength ? value : value[..maxLength];
}
