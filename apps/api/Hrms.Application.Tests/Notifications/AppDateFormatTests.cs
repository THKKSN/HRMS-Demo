using FluentAssertions;
using Hrms.Application.Common.Localization;
using Xunit;

namespace Hrms.Application.Tests.Notifications;

/// <summary>
/// ตรึงผลลัพธ์ของ format วันที่ (แผน notification-i18n งาน N3.1)
/// — ฝั่งไทยต้องเท่าของเดิมที่ <c>DailyAttendanceReportJob</c> ประกอบเองด้วย array ชื่อเดือน/ชื่อวัน
/// </summary>
public sealed class AppDateFormatTests
{
    // 2026-09-15 = วันอังคาร · พ.ศ. 2569
    private static readonly DateOnly Sample = new(2026, 9, 15);

    [Fact]
    public void ThaiUsesBuddhistYearAndThaiMonthName()
        => AppDateFormat.LongDate(Sample, "th").Should().Be("15 กันยายน 2569");

    [Fact]
    public void ThaiDayOfWeekKeepsTheWordDay()
        => AppDateFormat.DayOfWeek(Sample, "th").Should().Be("วันอังคาร");

    [Fact]
    public void EnglishUsesDayMonthYearOrderAndGregorianYear()
        => AppDateFormat.LongDate(Sample, "en").Should().Be("15 September 2026");

    [Fact]
    public void EnglishDayOfWeek()
        => AppDateFormat.DayOfWeek(Sample, "en").Should().Be("Tuesday");

    /// <summary>ภาษาที่ไม่รู้จักต้องไม่ระเบิด — ตกไปที่อังกฤษเหมือนกติกาอื่นทั้งระบบ</summary>
    [Fact]
    public void UnknownLocaleFallsBackToEnglish()
        => AppDateFormat.LongDate(Sample, "xx").Should().Be(AppDateFormat.LongDate(Sample, "en"));
}
