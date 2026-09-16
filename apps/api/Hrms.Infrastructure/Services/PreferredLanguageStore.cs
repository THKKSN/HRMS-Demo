using Hrms.Application.Common.Interfaces;
using Hrms.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Hrms.Infrastructure.Services;

/// <summary>
/// เขียน <c>preferred_language</c> ของผู้ใช้แบบ lazy — ดู <see cref="IPreferredLanguageStore"/>
///
/// <para>
/// ใช้ <c>ExecuteUpdateAsync</c> ไม่ใช่ <c>SaveChangesAsync</c> ด้วยเหตุผล 2 ข้อ:
/// (1) ไม่ต้องโหลดทั้งแถวมาก่อน (2) ไม่ไปสั่ง flush การเปลี่ยนแปลงอื่นที่ DbContext ตัวเดียวกัน
/// ของ request นี้กำลังถืออยู่ · ผลข้างเคียงคือ <c>UpdatedAt</c> ไม่ขยับ ซึ่งตรงกับเจตนา —
/// การเปลี่ยนภาษาหน้าจอไม่ควรนับเป็น "มีคนแก้ข้อมูลพนักงาน"
/// </para>
/// </summary>
public sealed class PreferredLanguageStore(
    HrmsDbContext db,
    PreferredLanguageWriteGuard guard,
    ILogger<PreferredLanguageStore> logger) : IPreferredLanguageStore
{
    public Task RememberEmployeeAsync(Guid employeeId, string locale, CancellationToken ct = default)
        => RememberAsync($"employee:{employeeId}", locale, () => db.Employees
            .Where(x => x.Id == employeeId && x.PreferredLanguage != locale)
            .ExecuteUpdateAsync(setters => setters.SetProperty(x => x.PreferredLanguage, locale), ct));

    public Task RememberExternalReporterAsync(Guid externalReporterId, string locale, CancellationToken ct = default)
        => RememberAsync($"external:{externalReporterId}", locale, () => db.ExternalReporters
            .Where(x => x.Id == externalReporterId && x.PreferredLanguage != locale)
            .ExecuteUpdateAsync(setters => setters.SetProperty(x => x.PreferredLanguage, locale), ct));

    private async Task RememberAsync(string subject, string locale, Func<Task<int>> update)
    {
        if (!guard.ShouldWrite(subject, locale)) return;
        try
        {
            await update();
            guard.Remember(subject, locale);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            // ล้มแล้วเงียบโดยตั้งใจ — ผู้ใช้ขอทำอย่างอื่นอยู่ ไม่ควรพัง request เพราะจำภาษาไม่สำเร็จ
            // ไม่ Remember ด้วย จะได้ลองใหม่ใน request ถัดไป
            logger.LogWarning(ex, "Failed to remember preferred language {Locale} for {Subject}", locale, subject);
        }
    }
}
