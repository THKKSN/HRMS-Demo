namespace Hrms.Application.Common.Localization;

/// <summary>
/// ตัวเลือกภาษาฝั่ง API — ก่อน Phase 4 ฝั่ง .NET ไม่เคยต้องตัดสินใจภาษาเองเลย
/// (ไม่มี <c>.resx</c> ไม่มี <c>IStringLocalizer</c> ดู docs/notification-i18n-plan.md ข้อ 2.5)
///
/// <para>
/// คู่แฝดฝั่ง frontend คือ <c>packages/i18n/src/locales.ts</c> — กติกาต้องตรงกัน แก้ที่เดียวไม่ได้
/// </para>
/// </summary>
public static class AppLocale
{
    /// <summary>ภาษาตั้งต้นเมื่อยังไม่รู้ภาษาของผู้ใช้ — ตรงกับ <c>DEFAULT_LOCALE</c> ฝั่ง frontend</summary>
    public const string Default = "th";

    /// <summary>
    /// ภาษาที่ผู้ใช้เลือกได้บนหน้าจอ — ตรงกับ <c>SUPPORTED_LOCALES</c> ฝั่ง frontend
    /// เก็บลง DB ตามที่ผู้ใช้เลือกจริง ไม่บิดค่าให้เพี้ยนตั้งแต่ตอนเขียน
    /// </summary>
    public static readonly IReadOnlyList<string> Supported = ["th", "en", "id"];

    /// <summary>
    /// ภาษาที่มีไฟล์คำแปลของ notification จริง (D9 — รอบนี้ยังไม่ทำอินโดฯ)
    /// เพิ่ม <c>id</c> ที่นี่ได้ทันทีเมื่อมี <c>messages/id/notifications.json</c> โดยไม่ต้องแตะ DB
    /// </summary>
    public static readonly IReadOnlyList<string> NotificationLocales = ["th", "en"];

    /// <summary>
    /// language tag ใด ๆ (<c>en-US</c>, <c>TH</c>, <c>ja</c>) → ภาษาที่เก็บได้
    /// คืน <c>null</c> เมื่อไม่มีค่ามาเลย = "ไม่รู้ภาษา" ซึ่งแปลว่าอย่าไปเขียนทับของเดิม
    ///
    /// <para>
    /// ภาษาที่ไม่รองรับตกเป็น <c>en</c> ไม่ใช่ <c>th</c> ตาม D5 —
    /// คนที่ตั้งเครื่องเป็นภาษาอื่นมีโอกาสอ่านไทยไม่ออก
    /// </para>
    /// <para>
    /// ค่าที่คืนมาจึงอยู่ในชุดที่รู้จักเสมอ — header จาก client ปลอมค่ามาเขียนลงคอลัมน์ตรง ๆ ไม่ได้
    /// </para>
    /// </summary>
    public static string? Normalize(string? languageTag)
    {
        if (string.IsNullOrWhiteSpace(languageTag)) return null;
        var primary = languageTag.Trim().ToLowerInvariant().Split('-', '_')[0];
        if (primary.Length == 0) return null;
        return Supported.Contains(primary, StringComparer.Ordinal) ? primary : "en";
    }

    /// <summary>
    /// ภาษาที่เก็บไว้ในคอลัมน์ <c>preferred_language</c> → ภาษาที่ใช้ประกอบข้อความ notification
    ///
    /// <para>
    /// ค่าว่าง (แถวเก่าที่ยังไม่เคยยิง header มา) = <c>th</c> เหมือนพฤติกรรมเดิมทุกประการ ·
    /// ภาษาที่ยังไม่มีไฟล์คำแปลตกเป็น <c>en</c> ตาม D5 ไม่ใช่ <c>th</c>
    /// </para>
    /// </summary>
    public static string ForNotifications(string? preferredLanguage)
    {
        var locale = Normalize(preferredLanguage);
        if (locale is null) return Default;
        return NotificationLocales.Contains(locale, StringComparer.Ordinal) ? locale : "en";
    }
}
