namespace Hrms.Application.Common.Interfaces;

/// <summary>
/// จำภาษาล่าสุดของผู้ใช้ไว้ให้ job ที่ทำงานนอก request อ่าน (D9)
///
/// <para>
/// เรียกจาก middleware ทุก request ที่มี header <c>X-Locale</c> — ตัวที่ implement
/// ต้องไม่เขียน DB ทุกครั้งที่ถูกเรียก และต้องไม่โยน exception ออกมา
/// เพราะนี่เป็นผลพลอยได้ของ request ไม่ใช่สิ่งที่ผู้ใช้ขอ
/// </para>
/// </summary>
public interface IPreferredLanguageStore
{
    Task RememberEmployeeAsync(Guid employeeId, string locale, CancellationToken ct = default);
    Task RememberExternalReporterAsync(Guid externalReporterId, string locale, CancellationToken ct = default);
}
