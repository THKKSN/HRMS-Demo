using FluentAssertions;
using Hrms.Application.Common.Localization;
using Hrms.Infrastructure.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Hrms.Application.Tests.Notifications;

/// <summary>
/// ข้อความของ job ลา + รายงานเข้างาน (แผน notification-i18n งาน N3.1)
/// — ฝั่งไทยตรึงไว้เท่าของเดิม ยกเว้นจุดที่แก้บั๊กซึ่งระบุไว้ชัดในแต่ละเทสต์
/// </summary>
public sealed class LeaveAndAttendanceTextTests
{
    /// <summary>
    /// 🐞 <b>แก้บั๊กที่มีอยู่เดิม:</b> ของเดิมเขียน <c>$"ขอลา{LeaveType.NameTh}"</c> แต่ชื่อประเภทการลา
    /// ที่ seed ไว้ขึ้นต้นด้วยคำว่า "ลา" อยู่แล้ว (<c>ลาพักร้อน</c>) ผู้อนุมัติจึงเห็น
    /// <c>"ขอลาลาพักร้อน"</c> ทุกใบ · ย้ายคำว่า "ขอ" เข้าเทมเพลตแล้วไม่ซ้ำอีก
    /// </summary>
    [Fact]
    public void LeavePendingAltText_NoLongerRepeatsTheWordLeave()
    {
        var text = Text("th").Of("leave.pending.altText", new
        {
            employee = "สมชาย ใจดี",
            leaveType = "ลาพักร้อน",
            dateRange = "01/10/2026–03/10/2026",
            days = 3,
        });

        text.Should().Be("📋 สมชาย ใจดี ขอลาพักร้อน 01/10/2026–03/10/2026 (3 วัน)");
        text.Should().NotContain("ลาลา");
    }

    [Fact]
    public void LeaveResultAltText_MatchesPreviousThaiWording()
    {
        var parameters = new { leaveType = "ลาพักร้อน", dateRange = "01/10/2026–03/10/2026" };

        Text("th").Of("leave.result.approvedAltText", parameters)
            .Should().Be("✅ คำขอลาพักร้อน 01/10/2026–03/10/2026 ของคุณได้รับอนุมัติแล้ว");
        Text("th").Of("leave.result.rejectedAltText", parameters)
            .Should().Be("❌ คำขอลาพักร้อน 01/10/2026–03/10/2026 ของคุณถูกปฏิเสธ");
    }

    [Fact]
    public void LeaveCardLabels_MatchPreviousThaiWording()
    {
        var text = Text("th");

        text.Of("leave.pending.title").Should().Be("📋 คำขอลางาน");
        text.Of("leave.field.employee").Should().Be("พนักงาน");
        text.Of("leave.value.days", new { days = 3 }).Should().Be("3 วัน");
        text.Of("leave.value.attachments", new { count = 2 }).Should().Be("📎 มีเอกสารแนบ 2 ไฟล์");
        text.Of("leave.action.approveDisplayText").Should().Be("อนุมัติคำขอลางาน");
    }

    /// <summary>
    /// วันที่บนรายงานเคยประกอบเองจาก array ชื่อเดือน/ชื่อวันภาษาไทย — ย้ายไปใช้ CultureInfo แล้ว
    /// ผลลัพธ์ต้องยังเท่าเดิมเป๊ะ รวมคำว่า "ที่" คั่นระหว่างชื่อวันกับวันที่
    /// </summary>
    [Fact]
    public void AttendanceReportDate_MatchesPreviousThaiWording()
    {
        var date = new DateOnly(2026, 9, 15);

        Text("th").Of("attendance.report.date", new
        {
            dayOfWeek = AppDateFormat.DayOfWeek(date, "th"),
            date = AppDateFormat.LongDate(date, "th"),
        }).Should().Be("วันอังคารที่ 15 กันยายน 2569");
    }

    [Fact]
    public void AttendanceReportDate_ReadsNaturallyInEnglish()
    {
        var date = new DateOnly(2026, 9, 15);

        Text("en").Of("attendance.report.date", new
        {
            dayOfWeek = AppDateFormat.DayOfWeek(date, "en"),
            date = AppDateFormat.LongDate(date, "en"),
        }).Should().Be("Tuesday 15 September 2026");
    }

    [Fact]
    public void AttendanceReportCounts_MatchPreviousThaiWording()
    {
        var text = Text("th");

        text.Of("attendance.report.ofTotalPeople", new { count = 42, total = 50 }).Should().Be("42/50 คน");
        text.Of("attendance.report.people", new { count = 3 }).Should().Be("3 คน");
        text.Of("attendance.report.andMorePeople", new { count = 4 }).Should().Be("และอีก 4 คน");
    }

    /// <summary>
    /// จำนวนคนเป็น 0 ต้องยังแสดง "0 คน" — ไม่ใช่หายทั้งบรรทัดตามกติกา "ตัวแปรว่าง = ตัดบรรทัด"
    /// (ศูนย์ไม่ใช่ค่าว่าง แต่เป็นจุดที่พลาดได้ง่าย)
    /// </summary>
    [Fact]
    public void ZeroCountStillRenders()
        => Text("th").Of("attendance.report.people", new { count = 0 }).Should().Be("0 คน");

    [Fact]
    public void WebhookRepliesMatchPreviousThaiWording()
    {
        var text = Text("th");

        text.Of("webhook.leave.approved").Should().Be("✅ อนุมัติแล้ว");
        text.Of("webhook.leave.supervisorApproved").Should().Be("✅ อนุมัติขั้นต้นแล้ว — รอ HR ยืนยัน");
        text.Of("webhook.alreadyCheckedIn", new { time = "08:05" })
            .Should().Be("คุณเช็คอินวันนี้ไปแล้ว เวลา 08:05 น.");
        text.Of("webhook.quota.remainingOfTotal", new { remaining = 7, total = 10 }).Should().Be("7/10 วัน");
    }

    private static MessageText Text(string locale)
        => new(new NotificationTemplateCatalog(
            NullLogger<NotificationTemplateCatalog>.Instance, RepositoryMessagesDirectory()), locale);

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
