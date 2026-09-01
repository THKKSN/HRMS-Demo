using FluentAssertions;
using Hrms.Application.Features.Tickets;
using Hrms.Application.Tests.Support;

namespace Hrms.Application.Tests.Tickets;

public class TicketNotificationDedupTests
{
    [Fact]
    public async Task QueueNotification_SameRecipientSameOccurrence_ShouldQueueOnce()
    {
        // เคสจริง: ผู้แจ้งเป็นหัวหน้าแผนกปลายทางเอง — resolve จะ queue ถึงคนเดียวกัน 2 ครั้ง
        // DeduplicationKey เป็น unique index ถ้าไม่กันซ้ำจะพัง SaveChanges (500 บน production)
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var ticket = await fixture.AddTicketAsync();
        var occurrenceId = Guid.NewGuid();

        TicketCommandSupport.QueueNotification(
            fixture.Db, "TicketResolved", occurrenceId, fixture.SupervisorId, "line-supervisor", "msg", ticket);
        TicketCommandSupport.QueueNotification(
            fixture.Db, "TicketResolved", occurrenceId, fixture.SupervisorId, "line-supervisor", "msg", ticket);

        fixture.Db.NotificationOutboxes.Local.Count.Should().Be(1);
        await fixture.Db.SaveChangesAsync();
    }

    [Fact]
    public async Task QueueNotification_DifferentRecipients_ShouldQueueBoth()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var ticket = await fixture.AddTicketAsync();
        var occurrenceId = Guid.NewGuid();

        TicketCommandSupport.QueueNotification(
            fixture.Db, "TicketResolved", occurrenceId, fixture.RequesterId, "line-requester", "msg", ticket);
        TicketCommandSupport.QueueNotification(
            fixture.Db, "TicketResolved", occurrenceId, fixture.SupervisorId, "line-supervisor", "msg", ticket);

        fixture.Db.NotificationOutboxes.Local.Count.Should().Be(2);
    }
}
