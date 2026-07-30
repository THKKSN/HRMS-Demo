using FluentAssertions;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Features.Tickets.Commands;
using Hrms.Application.Tests.Support;
using Hrms.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Tests.Tickets;

public class TicketReviewAndCancellationIntegrationTests
{
    [Fact]
    public async Task ReturnForRevision_ShouldPreserveMultipleReviewRounds()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var ticket = await fixture.AddTicketAsync(TicketStatus.Resolved, true);
        ticket.ProblemType = TicketProblemType.SystemDefect;
        ticket.ResolutionNote = "First fix";
        ticket.ResolvedByEmployeeId = fixture.AssigneeId;
        ticket.ResolvedAt = DateTime.UtcNow.AddHours(7);
        await fixture.Db.SaveChangesAsync();
        var handler = new ReturnTicketForRevisionHandler(
            fixture.Db,
            Supervisor(fixture),
            new TestPermissionService("ticket:return"),
            new TestAuditLogService());

        var first = await handler.Handle(
            new ReturnTicketForRevisionCommand(
                ticket.Id, "Please secure the cable", ticket.UpdatedAt),
            default);
        ticket.Status = TicketStatus.Resolved;
        ticket.ResolvedByEmployeeId = fixture.AssigneeId;
        ticket.ResolvedAt = DateTime.UtcNow.AddHours(7);
        ticket.ResolutionNote = "Second fix";
        await fixture.Db.SaveChangesAsync();
        await handler.Handle(
            new ReturnTicketForRevisionCommand(
                ticket.Id, "Please add final evidence", ticket.UpdatedAt),
            default);

        first.Status.Should().Be(TicketStatus.InProgress);
        var reviews = await fixture.Db.TicketReviews
            .OrderBy(x => x.ReviewRound).ToListAsync();
        reviews.Select(x => x.ReviewRound).Should().Equal(1, 2);
        reviews.Select(x => x.ReviewNote).Should().Equal(
            "Please secure the cable", "Please add final evidence");
        (await fixture.Db.NotificationOutboxes.CountAsync()).Should().Be(4);
    }

    [Fact]
    public async Task DuplicatePendingCancellation_ShouldBeRejected()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var ticket = await fixture.AddTicketAsync(TicketStatus.Assigned, true);
        var requester = new TestCurrentUser(
            fixture.RequesterId,
            fixture.CompanyId,
            fixture.SourceDepartmentId,
            RoleType.Employee);
        var handler = new RequestTicketCancellationHandler(
            fixture.Db,
            requester,
            new TestPermissionService("ticket:view-own"),
            new TestAuditLogService());

        var first = await handler.Handle(
            new RequestTicketCancellationCommand(
                ticket.Id, "The issue is no longer present", ticket.UpdatedAt),
            default);
        var act = () => handler.Handle(
            new RequestTicketCancellationCommand(
                ticket.Id, "Duplicate cancellation request", first.TicketUpdatedAt),
            default);

        await act.Should().ThrowAsync<ConflictException>()
            .Where(error => error.Code == "CANCELLATION_ALREADY_PENDING");
        (await fixture.Db.TicketCancellationRequests.CountAsync()).Should().Be(1);
    }

    private static TestCurrentUser Supervisor(TicketTestFixture fixture)
        => new(
            fixture.SupervisorId,
            fixture.CompanyId,
            fixture.TargetDepartmentId,
            RoleType.Supervisor);
}
