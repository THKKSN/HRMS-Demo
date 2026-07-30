using FluentAssertions;
using Hrms.Application.Features.Tickets;
using Hrms.Application.Tests.Support;
using Hrms.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Tests.Tickets;

public class TicketStatusTransitionTests
{
    [Fact]
    public async Task Record_ShouldPersistTrimmedTransitionMetadata()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var ticket = await fixture.AddTicketAsync();
        var assignmentId = Guid.NewGuid();
        var changedAt = DateTime.UtcNow.AddHours(7);

        TicketStatusTransition.Record(
            fixture.Db,
            ticket,
            TicketStatus.Open,
            TicketStatus.Assigned,
            fixture.SupervisorId,
            changedAt,
            "  Assigned manually  ",
            assignmentId);
        await fixture.Db.SaveChangesAsync();

        var history = await fixture.Db.TicketStatusHistory.SingleAsync();
        history.TicketId.Should().Be(ticket.Id);
        history.FromStatus.Should().Be(TicketStatus.Open);
        history.ToStatus.Should().Be(TicketStatus.Assigned);
        history.ChangedByEmployeeId.Should().Be(fixture.SupervisorId);
        history.Reason.Should().Be("Assigned manually");
        history.AssignmentId.Should().Be(assignmentId);
    }
}
