namespace Hrms.Application.Common.Helpers;

/// <summary>
/// แปลงรหัสพนักงานที่ผู้ใช้กรอก ให้เป็นรูปแบบเดียวที่เก็บใน <c>employees.employee_code</c>
///
/// เป็นคู่แฝดฝั่ง C# ของ <c>scripts/pad-employee-code-to-5.sql</c>:
/// <c>LPAD(TRIM(LEADING '0' FROM employee_code), 5, '0')</c> สำหรับรหัสตัวเลขล้วน
/// ที่ตัด 0 นำหน้าแล้วเหลือ 1-4 หลัก และตัด 0 นำหน้าอย่างเดียวสำหรับรหัสตัวเลข 5 หลักขึ้นไป
///
/// ถ้าสองที่นี้ไม่ตรงกัน พนักงานจะล็อกอินไม่ได้โดยไม่มี error ให้เห็น — แก้ต้องแก้คู่กัน
/// </summary>
public static class EmployeeCodeNormalizer
{
    private const int PaddedLength = 5;
    private const int MinPaddableDigits = 1;
    private const int MaxPaddableDigits = 4;

    public static string Normalize(string employeeCode)
    {
        var trimmed = employeeCode?.Trim() ?? string.Empty;
        if (trimmed.Length == 0) return string.Empty;

        // รหัสที่มีตัวอักษร (เช่น SYSADMIN) ไม่แตะ 0 นำหน้าเลย
        if (!trimmed.All(char.IsAsciiDigit)) return trimmed;

        var unpadded = trimmed.TrimStart('0');
        if (unpadded.Length == 0) unpadded = "0";

        return unpadded.Length is >= MinPaddableDigits and <= MaxPaddableDigits
            ? unpadded.PadLeft(PaddedLength, '0')
            : unpadded;
    }
}
