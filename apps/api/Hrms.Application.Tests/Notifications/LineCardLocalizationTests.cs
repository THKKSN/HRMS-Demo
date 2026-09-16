using System.Text.Encodings.Web;
using System.Text.Json;
using FluentAssertions;
using Hrms.Application.Common.Helpers;
using Hrms.Application.Common.Localization;
using Hrms.Infrastructure.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Hrms.Application.Tests.Notifications;

/// <summary>
/// การ์ดลงเวลาและข้อความ webhook ต้องเปลี่ยนตามภาษาผู้รับครบทั้งใบ (แผน notification-i18n งาน N3)
///
/// <para>
/// ใช้ไฟล์คำแปลจริงในเรโป — ถ้าลืมเติมคีย์ภาษาอังกฤษ เทสต์จะเห็นอักษรไทยโผล่บนการ์ดทันที
/// </para>
/// </summary>
public sealed class LineCardLocalizationTests
{
    private static readonly DateTime CheckIn = new(2026, 9, 15, 8, 5, 0);
    private static readonly DateTime CheckOut = new(2026, 9, 15, 17, 35, 0);

    [Fact]
    public void CheckInResultCard_InEnglish_HasNoThaiLeft()
    {
        var json = Json(LineFlexBuilder.BuildCheckInResultCard(
            Text("en"), "Somchai Jaidee", CheckIn, "Head Office", isLate: true, lateMinutes: 35));

        json.Should().NotMatchRegex("[฀-๿]");
        json.Should().Contain("Checked in").And.Contain("35 minutes late");
    }

    [Fact]
    public void CheckInResultCard_InThai_KeepsTheOriginalWording()
    {
        var json = Json(LineFlexBuilder.BuildCheckInResultCard(
            Text("th"), "สมชาย ใจดี", CheckIn, "สำนักงานใหญ่", isLate: false, lateMinutes: 0));

        json.Should().Contain("เช็คอินสำเร็จ")
            .And.Contain("มาทำงานตรงเวลา ✅")
            .And.Contain("08:05 น.")
            .And.Contain("สถานที่")
            .And.Contain("เวลาเข้า");
    }

    [Fact]
    public void CheckOutResultCard_InEnglish_HasNoThaiLeft()
    {
        var json = Json(LineFlexBuilder.BuildCheckOutResultCard(
            Text("en"), "Somchai Jaidee", CheckIn, CheckOut, "Head Office"));

        json.Should().NotMatchRegex("[฀-๿]");
        json.Should().Contain("Worked 9 h 30 min");
    }

    [Fact]
    public void CheckOutResultCard_InThai_KeepsTheOriginalWording()
    {
        var json = Json(LineFlexBuilder.BuildCheckOutResultCard(
            Text("th"), "สมชาย ใจดี", CheckIn, CheckOut, "สำนักงานใหญ่"));

        json.Should().Contain("เช็คเอาต์สำเร็จ")
            .And.Contain("ทำงาน 9 ชม. 30 นาที")
            .And.Contain("17:35 น.");
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void AttendancePromptCard_InEnglish_HasNoThaiLeft(bool isCheckIn)
    {
        var json = Json(LineFlexBuilder.BuildAttendancePromptCard(
            Text("en"), "Somchai Jaidee", isCheckIn, checkInTime: "08:05"));

        json.Should().NotMatchRegex("[฀-๿]");
        json.Should().Contain(isCheckIn ? "Share location to check in" : "Share location to check out");
    }

    /// <summary>
    /// สถานะบนการ์ด "วันนี้" เคยเป็น <c>switch</c> ที่คืนข้อความไทยตรง ๆ — ตอนนี้คืนคีย์
    /// ค่า enum ที่ยังไม่มีคำแปลต้องโชว์ชื่อคีย์ให้เห็น ไม่ใช่เงียบหาย
    /// </summary>
    [Theory]
    [InlineData("Present", "✅ มาทำงาน", "✅ Present")]
    [InlineData("Late", "⚠️ มาสาย", "⚠️ Late")]
    [InlineData("Absent", "❌ ขาดงาน", "❌ Absent")]
    [InlineData("HalfDay", "— ยังไม่ลงเวลา", "— Not recorded")]
    public void AttendanceTodayCard_ShowsStatusInBothLanguages(string status, string thai, string english)
    {
        Json(Today(status, "th")).Should().Contain(thai);
        Json(Today(status, "en")).Should().Contain(english);
    }

    [Fact]
    public void AttendanceTodayCard_InEnglish_HasNoThaiLeft()
        => Json(Today("Present", "en")).Should().NotMatchRegex("[฀-๿]");

    /// <summary>ยังไม่ได้เช็คเอาต์ = ขีด ไม่ใช่ "น." ลอย ๆ ทั้งสองภาษา</summary>
    [Fact]
    public void AttendanceTodayCard_ShowsDashWhenThereIsNoTime()
    {
        var json = Json(LineFlexBuilder.BuildAttendanceTodayCard(
            Text("th"), "สมชาย ใจดี", "15/09/2026", checkIn: "08:05", checkOut: null, status: "Present"));

        json.Should().Contain("08:05 น.").And.Contain("—");
    }

    private static object Today(string status, string locale)
        => LineFlexBuilder.BuildAttendanceTodayCard(
            Text(locale), "Somchai Jaidee", "15/09/2026", "08:05", "17:35", status);

    private static MessageText Text(string locale)
        => new(new NotificationTemplateCatalog(
            NullLogger<NotificationTemplateCatalog>.Instance, RepositoryMessagesDirectory()), locale);

    /// <summary>ต้องปิด escape ไม่งั้นอักษรไทยกลายเป็น <c>ย…</c> แล้วเทสต์ผ่านแบบหลอก ๆ</summary>
    private static string Json(object card)
        => JsonSerializer.Serialize(card, new JsonSerializerOptions
        {
            Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        });

    private static string RepositoryMessagesDirectory()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null)
        {
            var candidate = Path.Combine(directory.FullName, "packages", "i18n", "messages");
            if (Directory.Exists(candidate)) return candidate;
            directory = directory.Parent;
        }
        throw new InvalidOperationException("หา packages/i18n/messages ไม่เจอ");
    }
}
