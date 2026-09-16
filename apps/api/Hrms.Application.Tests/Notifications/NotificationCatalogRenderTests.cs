using System.Text.Encodings.Web;
using System.Text.Json;
using Hrms.Application.Common.Helpers;
using Hrms.Application.Common.Localization;
using Hrms.Application.Common.Notifications;
using Hrms.Infrastructure.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Hrms.Application.Tests.Notifications;

/// <summary>
/// ต่อสายจริงตั้งแต่ไฟล์คำแปล → แคตตาล็อก → ประกอบข้อความ แล้วเทียบกับ <b>ข้อความไทยตัวเดิมก่อนงาน N1</b>
/// เป็นหลักฐานว่าการย้ายไป <c>templateKey + params</c> ไม่ได้เปลี่ยนสิ่งที่ผู้ใช้เห็น
/// </summary>
public class NotificationCatalogRenderTests
{
    private static NotificationTemplateCatalog Catalog()
        => new(NullLogger<NotificationTemplateCatalog>.Instance, RepositoryMessagesDirectory());

    private static string Render(string key, object parameters)
    {
        var template = Catalog().Find(key, "th");
        Assert.NotNull(template);
        return NotificationTemplate.Render(template!, NotificationTemplate.ToParams(parameters));
    }

    [Fact]
    public void TicketCreated_MatchesPreviousThaiText()
    {
        var text = Render("ticket.created.toManager", new
        {
            ticketNo = "TK-0042",
            title = "แอร์ห้องประชุมเสีย",
            requester = "สมชาย ใจดี",
            department = "ซ่อมบำรุง",
            taxonomy = "งานอาคาร / เครื่องปรับอากาศ",
            priority = "ปกติ",
            routing = "มอบหมายอัตโนมัติ",
        });

        Assert.Equal(
            "มีใบแจ้งเรื่องใหม่ TK-0042\n"
            + "หัวข้อ: แอร์ห้องประชุมเสีย\n"
            + "จาก: สมชาย ใจดี\n"
            + "ปลายทาง: ซ่อมบำรุง\n"
            + "หมวด: งานอาคาร / เครื่องปรับอากาศ\n"
            + "ความเร่งด่วน: ปกติ\n"
            + "การกระจายงาน: มอบหมายอัตโนมัติ",
            text);
    }

    /// <summary>
    /// งานภายในไม่มีสถานที่ — ของเดิมใช้ <c>locationLine</c> ที่เป็นสตริงว่าง
    /// ตอนนี้ส่ง <c>location</c> ว่างแล้วให้บรรทัดหายไปเอง ผลลัพธ์ต้องเท่ากันเป๊ะ
    /// </summary>
    [Theory]
    [InlineData("", "คุณได้รับมอบหมายงาน TK-0042\nเรื่อง: แอร์เสีย\nผู้มอบหมาย: หัวหน้า ก")]
    [InlineData("อาคาร A ชั้น 3", "คุณได้รับมอบหมายงาน TK-0042\nเรื่อง: แอร์เสีย\nสถานที่: อาคาร A ชั้น 3\nผู้มอบหมาย: หัวหน้า ก")]
    public void TicketAssigned_OmitsLocationLineForInternalTickets(string location, string expected)
    {
        var text = Render("ticket.assigned.toAssignee", new
        {
            ticketNo = "TK-0042",
            title = "แอร์เสีย",
            location,
            assignedBy = "หัวหน้า ก",
        });

        Assert.Equal(expected, text);
    }

    [Theory]
    [InlineData(null, "เรื่อง 'ขอซื้อ - อุปกรณ์ - คอมพิวเตอร์' ได้รับการอนุมัติแล้ว")]
    [InlineData("อนุมัติตามที่เสนอ", "เรื่อง 'ขอซื้อ - อุปกรณ์ - คอมพิวเตอร์' ได้รับการอนุมัติแล้ว\nความเห็น: อนุมัติตามที่เสนอ")]
    public void MemoApproved_OmitsCommentLineWhenThereIsNoComment(string? comment, string expected)
    {
        var text = Render("memo.approved.toRequester", new
        {
            memoTitle = "ขอซื้อ - อุปกรณ์ - คอมพิวเตอร์",
            comment,
        });

        Assert.Equal(expected, text);
    }

    [Fact]
    public void TicketRejected_MatchesPreviousThaiText()
    {
        Assert.Equal(
            "ใบแจ้งเรื่อง TK-7 ถูกปฏิเสธ\nเหตุผล: ข้อมูลไม่ครบ",
            Render("ticket.rejected.toRequester", new { ticketNo = "TK-7", reason = "ข้อมูลไม่ครบ" }));
        Assert.Equal(
            "งาน TK-7 ถูกยุติ\nเหตุผล: ข้อมูลไม่ครบ",
            Render("ticket.rejected.toAssignee", new { ticketNo = "TK-7", reason = "ข้อมูลไม่ครบ" }));
    }

    // ลำดับภาษาสำรอง (ภาษาที่ขอ → en → th) ทดสอบแบบเจาะจงที่ NotificationTemplateCatalogFallbackTests
    // เพราะที่นี่ใช้ไฟล์จริงในเรโป ผลลัพธ์จะเปลี่ยนไปเองเมื่อมีไฟล์ภาษาใหม่เข้ามา

    /// <summary>
    /// เส้นทางเต็มของงาน N2: ผู้รับที่ตั้งภาษาอังกฤษต้องได้ข้อความอังกฤษ
    /// พร้อมชื่อแผนก/หมวดภาษาอังกฤษจาก master data และป้ายความเร่งด่วนที่แปลจากคีย์
    /// </summary>
    [Fact]
    public void TicketCreated_RendersInEnglishForAnEnglishRecipient()
    {
        var catalog = Catalog();
        var payload = NotificationPayload.FromTemplate(
            "ticket.created.toManager",
            new
            {
                ticketNo = "TK-0042",
                title = "Meeting room air conditioner is broken",
                requester = "Somchai Jaidee",
                priority = "#enum.priority.High",
                routing = "#enum.routing.AutoAssigned",
            },
            new()
            {
                ["department"] = LocalizedName.AllLocales("ซ่อมบำรุง", "Maintenance", null),
                ["taxonomy"] = LocalizedName.AllLocales("งานอาคาร / เครื่องปรับอากาศ", "Facilities / Air conditioning", null),
            });

        var text = NotificationTemplate.Render(
            catalog.Find(payload.TemplateKey!, "en")!,
            payload.ResolveParams("en", key => catalog.Find(key, "en")));

        Assert.Equal(
            "New ticket TK-0042\n"
            + "Subject: Meeting room air conditioner is broken\n"
            + "From: Somchai Jaidee\n"
            + "To: Maintenance\n"
            + "Category: Facilities / Air conditioning\n"
            + "Priority: Urgent\n"
            + "Routing: Assigned automatically",
            text);
    }

    /// <summary>ผู้รับคนเดียวกันที่ตั้งภาษาไทย ต้องได้ของเดิมทุกตัวอักษรจาก payload ก้อนเดียวกัน</summary>
    [Fact]
    public void TicketCreated_SamePayloadStillRendersThaiForThaiRecipients()
    {
        var catalog = Catalog();
        var payload = NotificationPayload.FromTemplate(
            "ticket.created.toManager",
            new
            {
                ticketNo = "TK-0042",
                title = "แอร์ห้องประชุมเสีย",
                requester = "สมชาย ใจดี",
                priority = "#enum.priority.High",
                routing = "#enum.routing.AutoAssigned",
            },
            new()
            {
                ["department"] = LocalizedName.AllLocales("ซ่อมบำรุง", "Maintenance", null),
                ["taxonomy"] = LocalizedName.AllLocales("งานอาคาร / เครื่องปรับอากาศ", "Facilities / Air conditioning", null),
            });

        var text = NotificationTemplate.Render(
            catalog.Find(payload.TemplateKey!, "th")!,
            payload.ResolveParams("th", key => catalog.Find(key, "th")));

        Assert.Equal(
            "มีใบแจ้งเรื่องใหม่ TK-0042\n"
            + "หัวข้อ: แอร์ห้องประชุมเสีย\n"
            + "จาก: สมชาย ใจดี\n"
            + "ปลายทาง: ซ่อมบำรุง\n"
            + "หมวด: งานอาคาร / เครื่องปรับอากาศ\n"
            + "ความเร่งด่วน: ด่วน\n"
            + "การกระจายงาน: มอบหมายอัตโนมัติ",
            text);
    }

    /// <summary>
    /// ด่านสุดท้ายของ N2: ผู้รับที่ตั้งภาษาอังกฤษต้องไม่เห็นอักษรไทยบนการ์ดเลยแม้แต่ตัวเดียว —
    /// คำบนกรอบการ์ด (ป้ายสถานะ, ปุ่ม, บรรทัดเวลา) เป็นของ builder ไม่ได้มาจาก payload
    /// จึงหลุดเป็นไทยได้ง่ายถ้าลืมแปล
    /// </summary>
    [Fact]
    public void TicketCard_ForAnEnglishRecipient_HasNoThaiLeftOnIt()
    {
        var catalog = Catalog();
        var card = LineFlexBuilder.BuildTicketNotificationCard(
            message: "Ticket TK-0042 has been rejected.\nReason: incomplete information",
            ticketUrl: "https://liff.example/tickets/1",
            eventType: "TicketRejected",
            text: new MessageText(catalog, "en"));

        var json = Json(card);

        Assert.DoesNotContain(json, (char c) => c is >= '฀' and <= '๿');
        Assert.Contains("Stopped", json, StringComparison.Ordinal);
        Assert.Contains("Open details", json, StringComparison.Ordinal);
    }

    /// <summary>ผู้รับที่ตั้งภาษาไทยต้องได้ป้ายและปุ่มแบบเดิมทุกตัวอักษร</summary>
    [Fact]
    public void TicketCard_ForAThaiRecipient_KeepsTheOriginalWording()
    {
        var catalog = Catalog();
        var card = LineFlexBuilder.BuildTicketNotificationCard(
            message: "ใบแจ้งเรื่อง TK-0042 ถูกปฏิเสธ\nเหตุผล: ข้อมูลไม่ครบ",
            ticketUrl: "https://liff.example/tickets/1",
            eventType: "TicketRejected",
            text: new MessageText(catalog, "th"));

        var json = Json(card);

        Assert.Contains("ยุติรายการ", json, StringComparison.Ordinal);
        Assert.Contains("เปิดดูรายละเอียด", json, StringComparison.Ordinal);
        // คีย์ที่หาไม่เจอจะโผล่เป็นชื่อคีย์บนการ์ด — ไม่ควรมีสักตัว
        Assert.DoesNotContain("card.", json, StringComparison.Ordinal);
    }

    [Fact]
    public void UnknownKey_ReturnsNullInsteadOfThrowing()
        => Assert.Null(Catalog().Find("ticket.doesNotExist.anywhere", "th"));

    /// <summary>
    /// ต้องปิด escape ของ System.Text.Json ไม่งั้นอักษรไทยกลายเป็น <c>ย…</c> แล้วเทสต์
    /// "ไม่มีอักษรไทยหลงเหลือ" จะผ่านทั้งที่ยังมีไทยอยู่จริง
    /// </summary>
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
