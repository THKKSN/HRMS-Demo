using System.Text.Json;
using System.Text.Json.Serialization;
using Hrms.Application.Common.Localization;

namespace Hrms.Application.Common.Notifications;

/// <summary>
/// เนื้อใน <c>NotificationOutbox.PayloadJson</c>
///
/// <para>
/// รูปใหม่ (แผน notification-i18n งาน N1) เก็บ <see cref="TemplateKey"/> + <see cref="Params"/>
/// แล้วประกอบข้อความ <b>ตอนส่ง</b> ตามภาษาผู้รับ — ไม่ได้เก็บข้อความสำเร็จรูปอีกแล้ว
/// </para>
/// <para>
/// <see cref="Message"/> คือรูปเก่าก่อนงาน N1 ที่เก็บข้อความไทยไว้ตรง ๆ · <b>ห้ามลบ</b>
/// เพราะคิวที่ค้างอยู่ตอน deploy ยังเป็นรูปนั้น และต้องส่งออกได้เหมือนเดิม
/// </para>
/// </summary>
public sealed record NotificationPayload
{
    public string? TemplateKey { get; init; }

    /// <summary>
    /// ตัวแปรที่ค่าเหมือนกันทุกภาษา (เลขที่ใบแจ้ง, ชื่อคน, ข้อความที่ผู้ใช้พิมพ์เอง)
    ///
    /// <para>
    /// ค่าที่ขึ้นต้นด้วย <c>#</c> เป็นข้อยกเว้น — ถือเป็น<b>คีย์ในแคตตาล็อก</b> ไม่ใช่ข้อความ
    /// ใช้กับป้าย enum อย่างความเร่งด่วน (<c>#enum.priority.Low</c>) ที่ต้องเปลี่ยนตามภาษาผู้รับ
    /// แต่เป็นข้อความคงที่ ไม่ได้มาจาก DB
    /// </para>
    /// </summary>
    public Dictionary<string, string>? Params { get; init; }

    /// <summary>
    /// ตัวแปรที่เป็นชื่อ master data ซึ่ง HR กรอกไว้หลายภาษา: ชื่อตัวแปร → (ภาษา → ค่า)
    ///
    /// <para>
    /// ต้องเก็บครบทุกภาษาตั้งแต่ตอน queue เพราะ ณ ตอนนั้นยังไม่รู้ว่าผู้รับแต่ละคนอ่านภาษาอะไร
    /// และ job ที่ส่งจริงก็ไม่ควรต้องวิ่งกลับไปอ่าน master data ใหม่ทีละแถว
    /// </para>
    /// </summary>
    public Dictionary<string, Dictionary<string, string>>? LocalizedParams { get; init; }

    /// <summary>ข้อความสำเร็จรูปแบบเดิม — ใช้เมื่อ row ไม่มี <see cref="TemplateKey"/></summary>
    public string? Message { get; init; }

    /// <summary>ไม่สนตัวพิมพ์ใหญ่เล็ก เพราะ row เก่าเขียนเป็น <c>Message</c> ส่วน row ใหม่เป็น <c>message</c></summary>
    private static readonly JsonSerializerOptions _json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    public static NotificationPayload FromTemplate(
        string templateKey,
        object? parameters = null,
        Dictionary<string, Dictionary<string, string>>? localizedParameters = null)
        => new()
        {
            TemplateKey = templateKey,
            Params = NotificationTemplate.ToParams(parameters),
            LocalizedParams = localizedParameters,
        };

    /// <summary>
    /// ตัวแปรที่พร้อมใส่ลงเทมเพลตแล้วสำหรับภาษาหนึ่ง — รวม 3 แหล่งเข้าด้วยกัน
    /// (ค่าคงที่ · คีย์แคตตาล็อกที่ขึ้นต้นด้วย <c>#</c> · ชื่อ master data หลายภาษา)
    ///
    /// <para>
    /// <paramref name="lookup"/> คือตัวหาข้อความจากแคตตาล็อกในภาษานั้น — หาไม่เจอให้คืน <c>null</c>
    /// แล้วจะตกไปใช้ชื่อคีย์แทน เพื่อให้เห็นบนหน้าจอว่าคีย์ไหนขาด
    /// </para>
    /// </summary>
    public Dictionary<string, string> ResolveParams(string locale, Func<string, string?> lookup)
    {
        var resolved = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var (name, value) in Params ?? [])
        {
            resolved[name] = value.StartsWith('#')
                ? lookup(value[1..]) ?? value[1..]
                : value;
        }
        foreach (var (name, byLocale) in LocalizedParams ?? [])
        {
            if (byLocale.TryGetValue(locale, out var value) && !string.IsNullOrWhiteSpace(value))
            {
                resolved[name] = value;
                continue;
            }
            // ภาษาที่ยังไม่มีในชุด (เช่น row เก่าที่เก็บไว้ก่อนเพิ่มภาษา) — en ก่อน th ตาม D5
            resolved[name] = byLocale.GetValueOrDefault("en")
                ?? byLocale.GetValueOrDefault(AppLocale.Default)
                ?? string.Empty;
        }
        return resolved;
    }

    public string ToJson() => JsonSerializer.Serialize(this, _json);

    public static NotificationPayload? FromJson(string json)
        => JsonSerializer.Deserialize<NotificationPayload>(json, _json);
}
