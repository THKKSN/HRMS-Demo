using System.Text.Json;
using Hangfire;
using Hrms.Application.Common.Helpers;
using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Enums;
using Hrms.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Hrms.Infrastructure.Jobs;

[DisableConcurrentExecution(timeoutInSeconds: 300)]
public class NotificationDeliveryJob(
    HrmsDbContext db,
    ILineMessagingService line,
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
                var payload = JsonSerializer.Deserialize<TicketNotificationPayload>(
                    delivery.PayloadJson)
                    ?? throw new InvalidOperationException("Notification payload is empty.");
                var ticketUrl = line.BuildLiffUri($"/tickets/{delivery.EntityId}");
                var card = LineFlexBuilder.BuildTicketNotificationCard(payload.Message, ticketUrl);
                await line.PushFlexMessageAsync(
                    delivery.LineUserId, TitleFrom(payload.Message), card, ct);
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

    private static string TitleFrom(string message)
        => message.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .FirstOrDefault() ?? "อัปเดตใบแจ้งเรื่อง";

    private static string Truncate(string value, int maxLength)
        => value.Length <= maxLength ? value : value[..maxLength];

    private sealed record TicketNotificationPayload(string Message);
}
