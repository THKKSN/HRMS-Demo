using Microsoft.Extensions.Caching.Memory;

namespace Hrms.Infrastructure.Services;

/// <summary>
/// ตัวกันไม่ให้ <see cref="PreferredLanguageStore"/> เขียน DB ทุก request —
/// จำภาษาล่าสุดของแต่ละคนไว้ในหน่วยความจำ แล้วยอมให้เขียนเฉพาะตอนค่าต่างจากที่จำไว้
///
/// <para>
/// แคชหายหรือ process ใหม่ไม่มีผลเสีย: อย่างมากคือเขียนซ้ำค่าเดิมหนึ่งครั้ง
/// และคำสั่ง UPDATE เองก็มีเงื่อนไข "ค่าต่างจากเดิม" กำกับอยู่อีกชั้น
/// </para>
/// </summary>
public sealed class PreferredLanguageWriteGuard(IMemoryCache cache)
{
    /// <summary>อายุที่จำไว้ — สั้นกว่านี้ก็แค่เขียนถี่ขึ้น ยาวกว่านี้ก็แค่เขียนห่างขึ้น ไม่มีผลต่อความถูกต้อง</summary>
    public static readonly TimeSpan Lifetime = TimeSpan.FromMinutes(30);

    public bool ShouldWrite(string subject, string locale)
        => !(cache.TryGetValue<string>(Key(subject), out var known)
            && string.Equals(known, locale, StringComparison.Ordinal));

    public void Remember(string subject, string locale)
        => cache.Set(Key(subject), locale, Lifetime);

    private static string Key(string subject) => $"preferred-language:{subject}";
}
