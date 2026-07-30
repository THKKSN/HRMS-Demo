using FluentAssertions;
using Hrms.Application.Features.Tickets.Commands;
using Hrms.Application.Tests.Support;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Tests.Tickets;

public class TicketAssignmentIntegrationTests
{
    [Fact]
    public async Task SupervisorAcceptAndAssign_ShouldKeepReceiverMetadata()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var ticket = await fixture.AddTicketAsync();
        var supervisor = Supervisor(fixture);
        var accept = new AcceptTicketHandler(
            fixture.Db,
            supervisor,
            new TestPermissionService("ticket:update-status"),
            new TestAuditLogService());

        var accepted = await accept.Handle(
            new AcceptTicketCommand(ticket.Id, ticket.UpdatedAt), default);
        var assign = new AssignTicketHandler(
            fixture.Db,
            supervisor,
            new TestPermissionService("ticket:assign"),
            new TestAuditLogService());
        await assign.Handle(
            new AssignTicketCommand(
                ticket.Id, fixture.AssigneeId, "Please inspect", accepted.UpdatedAt),
            default);

        var saved = await fixture.Db.Tickets.SingleAsync(x => x.Id == ticket.Id);
        saved.Status.Should().Be(TicketStatus.Assigned);
        saved.SupervisorAcceptedByEmployeeId.Should().Be(fixture.SupervisorId);
        saved.ReceiverEmployeeId.Should().Be(fixture.SupervisorId);
        (await fixture.Db.TicketAssignments.SingleAsync())
            .AssignedToEmployeeId.Should().Be(fixture.AssigneeId);
        (await fixture.Db.NotificationOutboxes.CountAsync()).Should().Be(3);
    }

    [Fact]
    public async Task RoutingEmployee_ShouldBeAbleToSelfClaimOpenTicket()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var ticket = await fixture.AddTicketAsync();
        fixture.Db.EmployeeResponsibilities.Add(new EmployeeResponsibility
        {
            CompanyId = fixture.CompanyId,
            DepartmentId = fixture.TargetDepartmentId,
            CategoryId = fixture.CategoryId,
            TopicId = null,
            EmployeeId = fixture.AssigneeId,
            IsActive = true,
            CreatedByEmployeeId = fixture.SupervisorId
        });
        await fixture.Db.SaveChangesAsync();
        var handler = new ClaimTicketHandler(
            fixture.Db,
            Worker(fixture),
            new TestPermissionService(
                "ticket:update-status", "ticket:view-assigned"),
            new TestAuditLogService());

        var result = await handler.Handle(
            new ClaimTicketCommand(ticket.Id, ticket.UpdatedAt), default);

        result.Status.Should().Be(TicketStatus.Assigned);
        var assignment = await fixture.Db.TicketAssignments.SingleAsync();
        assignment.AssignmentSource.Should().Be(TicketAssignmentSource.SelfClaim);
        assignment.RoutingLevelSnapshot.Should().Be(TicketRoutingLevel.Category);
        (await fixture.Db.NotificationOutboxes.SingleAsync())
            .EventType.Should().Be("TicketClaimed");
    }

    [Fact]
    public async Task ReassignAfterWorkStarted_ShouldResetWorkStateAndEndOldAssignment()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var ticket = await fixture.AddTicketAsync(TicketStatus.InProgress, true);
        ticket.WorkStartedByEmployeeId = fixture.AssigneeId;
        ticket.WorkStartedAt = DateTime.UtcNow.AddHours(7);
        await fixture.Db.SaveChangesAsync();
        var handler = new AssignTicketHandler(
            fixture.Db,
            Supervisor(fixture),
            new TestPermissionService("ticket:assign"),
            new TestAuditLogService());

        var result = await handler.Handle(
            new AssignTicketCommand(
                ticket.Id,
                fixture.SupervisorId,
                "Move work due to availability",
                ticket.UpdatedAt),
            default);

        result.Status.Should().Be(TicketStatus.Assigned);
        var assignments = await fixture.Db.TicketAssignments
            .OrderBy(x => x.AssignedAt).ToListAsync();
        assignments.Should().HaveCount(2);
        assignments[0].IsActive.Should().BeFalse();
        assignments[0].EndedAt.Should().NotBeNull();
        assignments[1].AssignedToEmployeeId.Should().Be(fixture.SupervisorId);
        ticket.WorkStartedAt.Should().BeNull();
        ticket.WorkStartedByEmployeeId.Should().BeNull();
    }

    private static TestCurrentUser Supervisor(TicketTestFixture fixture)
        => new(
            fixture.SupervisorId,
            fixture.CompanyId,
            fixture.TargetDepartmentId,
            RoleType.Supervisor);

    private static TestCurrentUser Worker(TicketTestFixture fixture)
        => new(
            fixture.AssigneeId,
            fixture.CompanyId,
            fixture.TargetDepartmentId,
            RoleType.Employee);
}
