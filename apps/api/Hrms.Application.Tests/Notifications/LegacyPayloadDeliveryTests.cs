using System.Text.Encodings.Web;
using System.Text.Json;
using FluentAssertions;
using Hrms.Application.Common.Helpers;
using Hrms.Application.Common.Localization;
using Hrms.Application.Common.Notifications;
using Hrms.Infrastructure.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Hrms.Application.Tests.Notifications;

/// <summary>
/// คิวที่ค้างอยู่ตอน deploy ยังเป็น payload รูปเก่า <c>{"Message":"…"}</c> ที่ประกอบข้อความไว้แล้ว
/// ตั้งแต่ตอน queue — ต้องออกจากการ์ดใบใหม่ได้เหมือนเดิม (แผน notification-i18n งาน N4.2)
///
/// <para>
/// ปกติงานนี้ตรวจด้วยการยิงจริงบน LINE แต่โควตา push เต็ม 300/300 ตอน deploy รอบนี้
/// (ดู <c>docs/line-push-quota-plan.md</c>) จึงย้ายมาตรึงด้วยเทสต์แทน
/// </para>
/// </summary>
public sealed class LegacyPayloadDeliveryTests
{
    private const string LegacyJson =
        """{"Message":"ใบแจ้งเรื่อง TK-0042 ถูกปฏิเสธ\nเหตุผล: ข้อมูลไม่ครบ\nผู้ดำเนินการ: สมชาย ใจดี"}""";

    /// <summary>
    /// ข้อความรูปเก่าเป็นไทยที่ประกอบเสร็จแล้ว — ห้ามพยายามแปลย้อนหลัง ต้องออกไปตามที่เก็บไว้
    /// แม้ผู้รับจะตั้งภาษาอังกฤษ (ตอน queue ไม่รู้ว่าใครจะเป็นผู้รับภาษาอะไร)
    /// </summary>
    [Theory]
    [InlineData("th")]
    [InlineData("en")]
    public void LegacyMessage_GoesOutWordForWord_WhateverTheRecipientLanguageIs(string locale)
    {
        var payload = NotificationPayload.FromJson(LegacyJson);

        var json = Json(LineFlexBuilder.BuildTicketNotificationCard(
            payload!.Message!, "https://liff.example/tickets/1",
            "TicketRejected", Text(locale), "INTERNAL TICKET"));

        json.Should().Contain("ใบแจ้งเรื่อง TK-0042 ถูกปฏิเสธ")
            .And.Contain("ข้อมูลไม่ครบ")
            .And.Contain("สมชาย ใจดี");
    }

    /// <summary>
    /// สีและป้ายหัวการ์ดอ่านจาก <c>EventType</c> ซึ่งเป็นคอลัมน์แยกใน outbox ไม่ได้อยู่ใน payload
    /// แถวเก่าจึงยังได้ป้ายถูกใบ — นี่คือเหตุผลที่ N0 ย้ายมาอ่าน eventType แทนการจับคำไทยในข้อความ
    /// </summary>
    [Fact]
    public void LegacyRow_StillGetsTheRightBadge_BecauseStyleReadsEventTypeNotWording()
    {
        var style = LineFlexBuilder.ResolveTicketStyle("TicketRejected");

        style.LabelKey.Should().Be("card.badge.stopped");
        Json(LineFlexBuilder.BuildTicketNotificationCard(
                NotificationPayload.FromJson(LegacyJson)!.Message!,
                "https://liff.example/tickets/1", "TicketRejected", Text("en"), "INTERNAL TICKET"))
            .Should().Contain("Stopped");
    }

    /// <summary>
    /// แถวเสียที่ไม่มีทั้ง <c>TemplateKey</c> และ <c>Message</c> ต้องไม่ทำให้ทั้ง batch ล้ม —
    /// job ส่งสตริงว่างเข้ามา การ์ดต้องยังประกอบได้
    /// </summary>
    [Fact]
    public void EmptyLegacyPayload_DoesNotThrow()
    {
        var payload = NotificationPayload.FromJson("{}");
        payload.Should().NotBeNull();
        payload!.TemplateKey.Should().BeNull();

        var render = () => LineFlexBuilder.BuildTicketNotificationCard(
            payload.Message ?? string.Empty, "https://liff.example/tickets/1",
            "TicketCommented", Text("th"), "INTERNAL TICKET");

        render.Should().NotThrow();
    }

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
