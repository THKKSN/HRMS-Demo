namespace Hrms.Application.Common.Localization;

/// <summary>
/// ชื่อ master data ที่ HR กรอกเอง (แผนก, หมวดใบแจ้ง, หัวข้อ) — คู่แฝดฝั่ง .NET ของ
/// <c>localizedName(item, locale)</c> ใน <c>packages/i18n/src/localized-name.ts</c>
///
/// <para>
/// ลำดับ fallback ตรงกับ CLAUDE.md: ภาษาที่เลือก → en → th · ค่าว่างถือว่ายังไม่ได้แปล
/// </para>
/// </summary>
public static class LocalizedName
{
    public static string For(string name, string? nameEn, string? nameId, string locale) => locale switch
    {
        "en" => First(nameEn, name),
        "id" => First(nameId, nameEn, name),
        _ => name,
    };

    /// <summary>
    /// ชื่อครบทุกภาษาที่รองรับ — ใช้ตอน queue notification เพราะยังไม่รู้ว่าผู้รับแต่ละคนอ่านภาษาอะไร
    /// (job เป็นคนเลือกทีหลังตอนส่งจริง ดู <c>NotificationPayload.LocalizedParams</c>)
    /// </summary>
    public static Dictionary<string, string> AllLocales(string name, string? nameEn, string? nameId)
        => AppLocale.Supported.ToDictionary(
            locale => locale,
            locale => For(name, nameEn, nameId, locale),
            StringComparer.Ordinal);

    private static string First(params string?[] candidates)
        => candidates.FirstOrDefault(x => !string.IsNullOrWhiteSpace(x)) ?? string.Empty;
}
