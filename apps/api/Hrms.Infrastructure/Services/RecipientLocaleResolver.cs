using Hrms.Application.Common.Localization;
using Hrms.Domain.Entities;
using Hrms.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Infrastructure.Services;

/// <summary>
/// หาภาษาที่ผู้รับ notification แต่ละคนควรได้ (D9)
///
/// <para>
/// พนักงานดูจาก <c>employees.preferred_language</c> · ผู้แจ้งภายนอกดูจาก
/// <c>external_reporters.preferred_language</c> โดยเทียบด้วย LINE user id เพราะ
/// <see cref="NotificationOutbox"/> ไม่ได้เก็บ <c>ExternalReporterId</c> ไว้ —
/// <c>RecipientEmployeeId == null</c> คือเครื่องหมายบอกว่าผู้รับเป็นผู้แจ้งภายนอก
/// (ดู docs/notification-i18n-plan.md ข้อ 2.3)
/// </para>
/// <para>
/// สร้างใหม่ทุกรอบงานแล้วจำค่าไว้ในรอบนั้น — คิวรอบเดียวกันมักมีหลายแถวของผู้รับคนเดิม
/// </para>
/// </summary>
public sealed class RecipientLocaleResolver(HrmsDbContext db)
{
    private readonly Dictionary<string, string> _resolved = new(StringComparer.Ordinal);

    public async Task<string> ResolveAsync(NotificationOutbox delivery, CancellationToken ct = default)
    {
        var key = delivery.RecipientEmployeeId?.ToString() ?? $"line:{delivery.LineUserId}";
        if (_resolved.TryGetValue(key, out var cached)) return cached;

        var stored = delivery.RecipientEmployeeId is { } employeeId
            ? await db.Employees.AsNoTracking()
                .Where(x => x.Id == employeeId)
                .Select(x => x.PreferredLanguage)
                .FirstOrDefaultAsync(ct)
            : await db.ExternalReporters.AsNoTracking()
                .Where(x => x.LineUserId == delivery.LineUserId)
                .Select(x => x.PreferredLanguage)
                .FirstOrDefaultAsync(ct);

        // หาแถวไม่เจอ (พนักงานถูกปิดใช้งาน/ผู้แจ้งเปลี่ยนบัญชี LINE) ก็ยังต้องส่งออกได้ — ตกเป็นไทยตามเดิม
        var locale = AppLocale.ForNotifications(stored);
        _resolved[key] = locale;
        return locale;
    }
}
