using System.Globalization;

namespace Hrms.Application.Common.Localization;

/// <summary>
/// format วันที่ฝั่ง API ตามภาษาผู้รับ — คู่แฝดของ <c>@hrms/i18n/format</c> ฝั่งหน้าจอ
/// ซึ่งใช้ <c>Intl</c> กับ tag ใน <c>INTL_LOCALE_TAG</c> · ที่นี่ใช้ <see cref="CultureInfo"/> ด้วยเหตุผลเดียวกัน:
/// ชื่อเดือน/ชื่อวันไม่ควรไปนั่งอยู่ในไฟล์คำแปลให้คนตรวจต้องไล่เช็ค
///
/// <para>
/// <c>th-TH</c> ใช้ปฏิทินพุทธเป็นค่าเริ่มต้นของ culture อยู่แล้ว จึงได้ปี พ.ศ. โดยไม่ต้องบวกเอง ·
/// <c>en-GB</c> ให้ลำดับ วัน-เดือน-ปี ใกล้เคียงของไทย (ตรงกับที่ frontend เลือกไว้)
/// </para>
/// <para>
/// เวลาทุกค่าเป็นเวลาไทยอยู่แล้วก่อนเข้ามาที่นี่ — ที่นี่ไม่แตะ timezone
/// </para>
/// </summary>
public static class AppDateFormat
{
    public static CultureInfo Culture(string locale) => locale switch
    {
        "th" => CultureInfo.GetCultureInfo("th-TH"),
        "id" => CultureInfo.GetCultureInfo("id-ID"),
        _ => CultureInfo.GetCultureInfo("en-GB"),
    };

    /// <summary>วันที่แบบเต็ม เช่น <c>16 กันยายน 2569</c> / <c>16 September 2026</c></summary>
    public static string LongDate(DateOnly date, string locale)
        => date.ToString("d MMMM yyyy", Culture(locale));

    /// <summary>ชื่อวันในสัปดาห์ เช่น <c>วันอังคาร</c> / <c>Tuesday</c></summary>
    public static string DayOfWeek(DateOnly date, string locale)
        => Culture(locale).DateTimeFormat.GetDayName(date.DayOfWeek);
}
