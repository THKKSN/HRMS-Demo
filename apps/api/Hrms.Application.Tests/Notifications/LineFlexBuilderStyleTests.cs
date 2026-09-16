using Hrms.Application.Common.Helpers;
using Xunit;

namespace Hrms.Application.Tests.Notifications;

/// <summary>
/// ล็อกคู่ <c>NotificationOutbox.EventType → สี/คีย์ป้ายหัวการ์ด</c>
///
/// <para>
/// ก่อนงาน N0 (แผน <c>docs/notification-i18n-plan.md</c>) สไตล์มาจากการเดาคำไทยในเนื้อข้อความ
/// ซึ่งพังทันทีที่ข้อความเปลี่ยนภาษา และเปลี่ยนเงียบ ๆ เมื่อมีคนแก้ถ้อยคำ
/// เทสต์ชุดนี้จึงเป็นตัวกันไม่ให้หลุดกลับไป และเป็นที่เดียวที่บอกว่า event ไหนควรได้สีอะไร
/// </para>
/// </summary>
public class LineFlexBuilderStyleTests
{
    [Theory]
    // ── ยุติ/ไม่อนุมัติ ────────────────────────────────────────────────
    [InlineData("TicketRejected", "#C63C3C", "card.badge.stopped")]
    [InlineData("TicketCancellationRejected", "#C63C3C", "card.badge.notApproved")]
    [InlineData("MemoRejected", "#C63C3C", "card.badge.notApproved")]
    [InlineData("MemoStepRejected", "#C63C3C", "card.badge.notApproved")]
    // ── ยกเลิก ────────────────────────────────────────────────────────
    [InlineData("TicketCancelled", "#5B6472", "card.badge.cancelled")]
    [InlineData("TicketCancellationRequested", "#B7791F", "card.badge.pendingReview")]
    // ── อนุมัติ (memo) ────────────────────────────────────────────────
    [InlineData("MemoSubmitted", "#B7791F", "card.badge.pendingApproval")]
    [InlineData("MemoApproved", "#17855B", "card.badge.approved")]
    [InlineData("MemoDelivered", "#17855B", "card.badge.approved")]
    // ── รอตรวจรับ ─────────────────────────────────────────────────────
    [InlineData("TicketResolved", "#087EA4", "card.badge.awaitingAcceptance")]
    [InlineData("MemoDeliveredToRequester", "#087EA4", "card.badge.awaitingAcceptance")]
    // ── ต้องดำเนินการ ─────────────────────────────────────────────────
    [InlineData("TicketReturned", "#B7791F", "card.badge.actionRequired")]
    [InlineData("TicketWaitingInfo", "#B7791F", "card.badge.actionRequired")]
    // ── ปิดงาน ────────────────────────────────────────────────────────
    [InlineData("TicketClosed", "#17855B", "card.badge.closed")]
    [InlineData("TicketRequesterConfirmed", "#17855B", "card.badge.closed")]
    // ── กำลังทำ / มอบหมาย ─────────────────────────────────────────────
    [InlineData("TicketStarted", "#1267A5", "card.badge.inProgress")]
    [InlineData("TicketAccepted", "#3563C9", "card.badge.assigned")]
    [InlineData("TicketAssigned", "#3563C9", "card.badge.assigned")]
    [InlineData("TicketReassigned", "#3563C9", "card.badge.assigned")]
    [InlineData("TicketClaimed", "#3563C9", "card.badge.assigned")]
    [InlineData("TicketTeamMemberAdded", "#3563C9", "card.badge.assigned")]
    // ── อื่น ๆ ────────────────────────────────────────────────────────
    [InlineData("TicketCommented", "#5B6472", "card.badge.newMessage")]
    [InlineData("TicketCreated", "#0F8F72", "card.badge.newTicket")]
    [InlineData("TicketTeamMemberRemoved", "#0F8F72", "card.badge.newTicket")]
    [InlineData("MemoStepReady", "#0F8F72", "card.badge.newTicket")]
    [InlineData("MemoStepsCompleted", "#0F8F72", "card.badge.newTicket")]
    [InlineData("MemoStepReturned", "#0F8F72", "card.badge.newTicket")]
    [InlineData("MemoReturnedToRequester", "#0F8F72", "card.badge.newTicket")]
    [InlineData("MemoResubmitted", "#0F8F72", "card.badge.newTicket")]
    public void ResolveTicketStyle_MapsEventTypeToStyle(string eventType, string accentColor, string labelKey)
    {
        var style = LineFlexBuilder.ResolveTicketStyle(eventType);

        Assert.Equal(accentColor, style.AccentColor);
        Assert.Equal(labelKey, style.LabelKey);
    }

    /// <summary>
    /// event ที่ยังไม่ได้แมป (หรือ row เก่าที่ค้างในคิว) ต้องได้สไตล์ default ไม่ใช่ throw
    /// — ไม่งั้น notification ที่ค้างอยู่จะส่งไม่ออกทั้งก้อนตอน deploy
    /// </summary>
    [Theory]
    [InlineData("SomeFutureEvent")]
    [InlineData("")]
    [InlineData(null)]
    public void ResolveTicketStyle_UnknownEventType_FallsBackToDefault(string? eventType)
    {
        var style = LineFlexBuilder.ResolveTicketStyle(eventType);

        Assert.Equal("#0F8F72", style.AccentColor);
        Assert.Equal("card.badge.newTicket", style.LabelKey);
    }

    /// <summary>
    /// สไตล์ต้องไม่ขึ้นกับเนื้อข้อความอีกแล้ว — ผู้ใช้พิมพ์คำว่า "ปฏิเสธ" ในคอมเมนต์
    /// เคยทำให้การ์ด "มีข้อความใหม่" กลายเป็นสีแดง
    /// </summary>
    [Fact]
    public void ResolveTicketStyle_IgnoresMessageText()
    {
        var style = LineFlexBuilder.ResolveTicketStyle("TicketCommented");

        Assert.Equal("card.badge.newMessage", style.LabelKey);
        Assert.Equal(
            style,
            LineFlexBuilder.ResolveTicketStyle("TicketCommented"));
    }
}
