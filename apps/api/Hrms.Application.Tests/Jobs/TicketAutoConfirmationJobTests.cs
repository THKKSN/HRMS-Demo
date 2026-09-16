using FluentAssertions;
using Hrms.Application.Common.Options;
using Hrms.Application.Tests.Support;
using Hrms.Domain.Enums;
using Hrms.Infrastructure.Jobs;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Hrms.Application.Tests.Jobs;

public sealed class TicketAutoConfirmationJobTests
{
    /// <summary>
    /// snapshot บนใบมาก่อน ไม่มีจึงถอยไปใช้ Ticket:AutoAcknowledgeAfterDaysDefault
    /// เคส snapshot = null คือเคสที่ production เจอ: ใบถูกสร้างตอนยังไม่มี workflow ผูกไว้
    /// </summary>
    [Theory]
    // snapshot ว่าง -> ใช้ default 7 วัน
    [InlineData(null, 15, 7, true)]
    [InlineData(null, 8, 7, true)]
    [InlineData(null, 7, 7, true)]
    [InlineData(null, 6, 7, false)]
    [InlineData(null, 0, 7, false)]
    // snapshot มีค่า -> ใช้ค่าบนใบ ไม่สนใจ default
    [InlineData(3, 5, 7, true)]
    [InlineData(14, 8, 7, false)]
    [InlineData(14, 20, 7, true)]
    // default ที่ตั้งต่ำกว่า 1 ถูกปัดเป็น 1
    [InlineData(null, 1, 0, true)]
    [InlineData(null, 0, -5, false)]
    public async Task RunAsync_ShouldCloseOnlyTicketsPastTheirWaitingPeriod(
        int? snapshotDays, int daysSinceVerified, int defaultDays, bool shouldClose)
    {
        await using var fixture = new TicketTestFixture();
        var ticket = await fixture.AddTicketAsync(
            TicketStatus.AwaitingRequesterConfirmation, activeAssignment: true);
        ticket.VerifiedAt = DateTime.UtcNow.AddHours(7).AddDays(-daysSinceVerified);
        ticket.VerifiedByEmployeeId = fixture.SupervisorId;
        ticket.WorkflowAutoAcknowledgeAfterDays = snapshotDays;
        await fixture.Db.SaveChangesAsync();
        fixture.Db.ChangeTracker.Clear();

        await CreateJob(fixture, defaultDays).RunAsync();

        var reloaded = await fixture.Db.Tickets.SingleAsync(x => x.Id == ticket.Id);
        reloaded.Status.Should().Be(
            shouldClose ? TicketStatus.Closed : TicketStatus.AwaitingRequesterConfirmation);
    }

    [Fact]
    public async Task RunAsync_ShouldRecordTheFullClosureTrailWhenFallingBackToTheDefault()
    {
        await using var fixture = new TicketTestFixture();
        var ticket = await fixture.AddTicketAsync(
            TicketStatus.AwaitingRequesterConfirmation, activeAssignment: true);
        var verifiedAt = DateTime.UtcNow.AddHours(7).AddDays(-10);
        ticket.VerifiedAt = verifiedAt;
        ticket.VerifiedByEmployeeId = fixture.SupervisorId;
        ticket.WorkflowAutoAcknowledgeAfterDays = null;
        await fixture.Db.SaveChangesAsync();
        fixture.Db.ChangeTracker.Clear();

        await CreateJob(fixture, defaultDays: 7).RunAsync();

        var reloaded = await fixture.Db.Tickets.SingleAsync(x => x.Id == ticket.Id);
        reloaded.Status.Should().Be(TicketStatus.Closed);
        reloaded.ClosedByEmployeeId.Should().Be(fixture.SupervisorId);
        reloaded.ClosedAt.Should().NotBeNull();
        reloaded.WorkflowCurrentStepKey.Should().Be("closed");

        // ผู้รับผิดชอบต้องถูกปลดออกจากงาน ไม่ค้างเป็นงานในมือ
        var assignment = await fixture.Db.TicketAssignments.SingleAsync();
        assignment.IsActive.Should().BeFalse();
        assignment.ActiveSlot.Should().BeNull();
        assignment.EndedAt.Should().NotBeNull();

        var history = await fixture.Db.TicketStatusHistory.SingleAsync();
        history.FromStatus.Should().Be(TicketStatus.AwaitingRequesterConfirmation);
        history.ToStatus.Should().Be(TicketStatus.Closed);
        history.Reason.Should().Be("AutoRequesterConfirmation");
        (await fixture.Db.TicketProgressEntries.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task RunAsync_ShouldLeaveTicketsThatAreNotWaitingForTheRequester()
    {
        await using var fixture = new TicketTestFixture();
        var ticket = await fixture.AddTicketAsync(TicketStatus.Resolved, activeAssignment: true);
        ticket.VerifiedAt = DateTime.UtcNow.AddHours(7).AddDays(-30);
        ticket.VerifiedByEmployeeId = fixture.SupervisorId;
        await fixture.Db.SaveChangesAsync();
        fixture.Db.ChangeTracker.Clear();

        await CreateJob(fixture, defaultDays: 7).RunAsync();

        var reloaded = await fixture.Db.Tickets.SingleAsync(x => x.Id == ticket.Id);
        reloaded.Status.Should().Be(TicketStatus.Resolved);
        (await fixture.Db.TicketStatusHistory.CountAsync()).Should().Be(0);
    }

    /// <summary>ใบที่ยังไม่ผ่านการตรวจ (verified_at ว่าง) ยังไม่เริ่มนับ ต้องไม่ถูกปิด</summary>
    [Fact]
    public async Task RunAsync_ShouldSkipTicketsWithoutVerifiedAt()
    {
        await using var fixture = new TicketTestFixture();
        var ticket = await fixture.AddTicketAsync(
            TicketStatus.AwaitingRequesterConfirmation, activeAssignment: true);
        ticket.VerifiedAt = null;
        ticket.WorkflowAutoAcknowledgeAfterDays = null;
        await fixture.Db.SaveChangesAsync();
        fixture.Db.ChangeTracker.Clear();

        await CreateJob(fixture, defaultDays: 7).RunAsync();

        var reloaded = await fixture.Db.Tickets.SingleAsync(x => x.Id == ticket.Id);
        reloaded.Status.Should().Be(TicketStatus.AwaitingRequesterConfirmation);
    }

    private static TicketAutoConfirmationJob CreateJob(TicketTestFixture fixture, int defaultDays) =>
        new(fixture.Db,
            Options.Create(new TicketOptions { AutoAcknowledgeAfterDaysDefault = defaultDays }),
            NullLogger<TicketAutoConfirmationJob>.Instance);
}
