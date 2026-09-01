using FluentAssertions;
using Hrms.Application.Features.Tickets.Queries;
using Hrms.Application.Tests.Support;
using Hrms.Domain.Enums;

namespace Hrms.Application.Tests.Tickets;

public class TicketPendingCountsTests
{
    [Fact]
    public async Task Assignee_ShouldCountActiveAndWaitingInfoAssignments()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        await fixture.AddTicketAsync(TicketStatus.Assigned, activeAssignment: true);
        await fixture.AddTicketAsync(TicketStatus.InProgress, activeAssignment: true);
        await fixture.AddTicketAsync(TicketStatus.WaitingInfo, activeAssignment: true);
        await fixture.AddTicketAsync(TicketStatus.Closed, activeAssignment: true);
        var user = new TestCurrentUser(
            fixture.AssigneeId, fixture.CompanyId, fixture.TargetDepartmentId,
            RoleType.Employee);
        var handler = new GetTicketPendingCountsHandler(
            fixture.Db, user, new TestPermissionService("ticket:view-assigned", "ticket:view-own"));

        var counts = await handler.Handle(new GetTicketPendingCountsQuery(), default);

        counts.AssignedActive.Should().Be(2);
        counts.AssignedWaitingInfo.Should().Be(1);
        counts.MyOpen.Should().Be(0);
        counts.InboxUntriaged.Should().BeNull();
        counts.MemoAwaitingApproval.Should().BeNull();
    }

    [Fact]
    public async Task Requester_ShouldCountOwnOpenAndAwaitingConfirmation()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        await fixture.AddTicketAsync(TicketStatus.Open);
        await fixture.AddTicketAsync(TicketStatus.InProgress, activeAssignment: true);
        await fixture.AddTicketAsync(TicketStatus.AwaitingRequesterConfirmation, activeAssignment: true);
        await fixture.AddTicketAsync(TicketStatus.Closed);
        await fixture.AddTicketAsync(TicketStatus.Cancelled);
        var user = new TestCurrentUser(
            fixture.RequesterId, fixture.CompanyId, fixture.SourceDepartmentId,
            RoleType.Employee);
        var handler = new GetTicketPendingCountsHandler(
            fixture.Db, user, new TestPermissionService("ticket:view-own"));

        var counts = await handler.Handle(new GetTicketPendingCountsQuery(), default);

        counts.MyOpen.Should().Be(3);
        counts.AwaitingMyConfirmation.Should().Be(1);
        counts.AssignedActive.Should().BeNull();
        counts.Claimable.Should().BeNull();
    }

    [Fact]
    public async Task Supervisor_ShouldCountUntriagedInboxInScope()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        await fixture.AddTicketAsync(TicketStatus.Open);
        await fixture.AddTicketAsync(TicketStatus.Open);
        await fixture.AddTicketAsync(TicketStatus.InProgress, activeAssignment: true);
        var user = new TestCurrentUser(
            fixture.SupervisorId, fixture.CompanyId, fixture.TargetDepartmentId,
            RoleType.Supervisor);
        var handler = new GetTicketPendingCountsHandler(
            fixture.Db, user, new TestPermissionService("ticket:view-team"));

        var counts = await handler.Handle(new GetTicketPendingCountsQuery(), default);

        counts.InboxUntriaged.Should().Be(2);
        counts.CancellationPending.Should().Be(0);
        counts.AssignedActive.Should().BeNull();
        counts.MyOpen.Should().BeNull();
    }
}
