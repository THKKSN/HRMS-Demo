namespace Hrms.Application.Common.Helpers;

/// <summary>
/// ชื่อภาษาอื่นของ master data (NameEn / NameId — i18n Phase M)
/// ค่าว่างหรือช่องว่างล้วนเก็บเป็น null เสมอ เพื่อให้ฝั่งแสดงผล fallback ไปภาษาถัดไปได้ (locale → en → th)
/// </summary>
public static class NameText
{
    public static string? Normalize(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    /// <summary>
    /// ใช้ตอน update: client ที่ไม่ส่งฟิลด์นี้มา (null) = คงค่าเดิม, ส่ง "" = ล้างค่า
    /// กันหน้าที่ PUT เฉพาะบางฟิลด์ (toggle เปิด/ปิด, template panel, client เวอร์ชันเก่า) ล้างคำแปลทิ้งโดยไม่ตั้งใจ
    /// </summary>
    public static string? Apply(string? current, string? incoming)
        => incoming is null ? current : Normalize(incoming);
}
