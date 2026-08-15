using FluentAssertions;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Features.Tickets;
using Hrms.Application.Tests.Support;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;

namespace Hrms.Application.Tests.Tickets;

public class TicketAccessTests
{
    private static readonly Guid ExternalCompanyId =
        Guid.Parse("c89cb0d1-7548-4c1b-a36a-929f094f0b30");

    private static readonly string[] WorkerPermissions =
    [
        "ticket:view-assigned",
        "ticket:update-status",
        "ticket:resolve",
        "ticket:comment",
        "ticket:add-attachment"
    ];

    [Fact]
    public async Task ActiveAssignee_ShouldReceiveWorkActionsForAssignedTicket()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var ticket = await fixture.AddTicketAsync(TicketStatus.Assigned, true);
        var user = new TestCurrentUser(
            fixture.AssigneeId, fixture.CompanyId, fixture.TargetDepartmentId,
            RoleType.Employee);

        var actions = await TicketAccess.GetActionFlagsAsync(
            fixture.Db, user, new TestPermissionService(WorkerPermissions), ticket, default);

        actions.CanStart.Should().BeTrue();
        actions.CanEditWorkDetail.Should().BeTrue();
        actions.CanResolve.Should().BeFalse();
        actions.CanRequestCancellation.Should().BeFalse();
    }

    [Fact]
    public async Task TerminalTicket_ShouldDisableRequesterMutationActions()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var ticket = await fixture.AddTicketAsync(TicketStatus.Closed);
        var user = new TestCurrentUser(
            fixture.RequesterId, fixture.CompanyId, fixture.SourceDepartmentId,
            RoleType.Employee);
        var permissions = new TestPermissionService(
            "ticket:view-own", "ticket:comment", "ticket:add-attachment");

        var actions = await TicketAccess.GetActionFlagsAsync(
            fixture.Db, user, permissions, ticket, default);

        actions.IsRequester.Should().BeTrue();
        actions.CanComment.Should().BeFalse();
        actions.CanAddAttachment.Should().BeFalse();
        actions.CanRequestCancellation.Should().BeFalse();
    }

    [Fact]
    public async Task SupervisorOutsideTargetDepartment_ShouldBeForbidden()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var ticket = await fixture.AddTicketAsync();
        var user = new TestCurrentUser(
            fixture.OutsiderId, fixture.CompanyId, fixture.SourceDepartmentId,
            RoleType.Supervisor);

        var act = () => TicketAccess.EnsureCanViewAsync(
            fixture.Db, user, new TestPermissionService("ticket:view-team"), ticket, default);

        await act.Should().ThrowAsync<AppForbiddenException>();
    }

    [Fact]
    public async Task HistoricalPrimaryAssignee_ShouldRetainReadAccess()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var ticket = await fixture.AddTicketAsync(TicketStatus.InProgress);
        fixture.Db.TicketAssignments.Add(new TicketAssignment
        {
            TicketId = ticket.Id,
            AssignedToEmployeeId = fixture.AssigneeId,
            AssignedByEmployeeId = fixture.SupervisorId,
            AssignedAt = DateTime.UtcNow.AddDays(-1),
            EndedAt = DateTime.UtcNow,
            IsPrimary = true,
            IsActive = false,
            AssignmentSource = TicketAssignmentSource.Manual
        });
        await fixture.Db.SaveChangesAsync();
        var user = new TestCurrentUser(
            fixture.AssigneeId, fixture.CompanyId, fixture.TargetDepartmentId,
            RoleType.Employee);

        var act = () => TicketAccess.EnsureCanViewAsync(
            fixture.Db, user, new TestPermissionService("ticket:view-assigned"),
            ticket, default);

        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task TargetDepartmentSupervisor_ShouldAccessAndAcceptExternalTicket()
    {
        await using var fixture = new TicketTestFixture(ExternalCompanyId);
        await fixture.SeedOrganizationAsync();
        var ticket = await fixture.AddExternalTicketAsync();
        var user = new TestCurrentUser(
            fixture.SupervisorId, fixture.CompanyId, fixture.TargetDepartmentId, RoleType.Supervisor);
        var permissions = new TestPermissionService("ticket:view-team", "ticket:update-status");

        var view = () => TicketAccess.EnsureCanViewAsync(
            fixture.Db, user, permissions, ticket, default);
        var actions = await TicketAccess.GetActionFlagsAsync(
            fixture.Db, user, permissions, ticket, default);

        await view.Should().NotThrowAsync();
        actions.IsRequester.Should().BeFalse();
        actions.CanAccept.Should().BeTrue();
    }
}
