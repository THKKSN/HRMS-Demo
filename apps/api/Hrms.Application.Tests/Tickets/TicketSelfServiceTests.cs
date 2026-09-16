using FluentAssertions;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Options;
using Hrms.Application.Features.Tickets;
using Hrms.Application.Features.Tickets.Commands;
using Hrms.Application.Tests.Support;
using Hrms.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Hrms.Application.Tests.Tickets;

/// <summary>
/// เคส "ทำงานเอง" — หัวหน้าแผนกที่เปิดเรื่องเข้าแผนกตัวเองต้องเดินงานได้ครบวงจร
/// (แผนกเล็กมีหัวหน้าคนเดียว ถ้ากันไว้ใบนั้นจะตันทั้งใบ)
/// ส่วนผู้แจ้งที่ไม่ได้ดูแลแผนกปลายทางยังถูกกันจากฝั่งผู้รับเหมือนเดิม
/// </summary>
public class TicketSelfServiceTests
{
    private static TestPermissionService Permissions() => new(
        "ticket:view-own", "ticket:view-team", "ticket:view-assigned", "ticket:assign",
        "ticket:triage", "ticket:update-status", "ticket:resolve", "ticket:close",
        "ticket:verify", "ticket:return", "ticket:comment", "ticket:add-attachment",
        "ticket:add-internal-note", "ticket:manage-team", "ticket:work-as-team-member");

    private static TestCurrentUser Manager(TicketTestFixture fixture)
        => new(fixture.SupervisorId, fixture.CompanyId, fixture.TargetDepartmentId, RoleType.Supervisor);

    private static TestCurrentUser Employee(TicketTestFixture fixture, Guid employeeId)
        => new(employeeId, fixture.CompanyId, fixture.TargetDepartmentId, RoleType.Employee);

    [Fact]
    public async Task ManagerWhoOpenedOwnTicket_ShouldStillGetReceiverActions()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var ticket = await fixture.AddTicketAsync(TicketStatus.Open);
        ticket.RequesterEmployeeId = fixture.SupervisorId;
        await fixture.Db.SaveChangesAsync();
        fixture.Db.ChangeTracker.Clear();

        var flags = await TicketAccess.GetActionFlagsAsync(
            fixture.Db, Manager(fixture), Permissions(),
            await fixture.Db.Tickets.FirstAsync(item => item.Id == ticket.Id), default);

        flags.IsRequester.Should().BeTrue();
        flags.CanAccept.Should().BeTrue();
        flags.CanTriage.Should().BeTrue();
        flags.CanAssign.Should().BeTrue();
        flags.CanReject.Should().BeTrue();
    }

    [Fact]
    public async Task ManagerWhoOpenedOwnTicket_ShouldBeAbleToWorkAndCloseItself()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var ticket = await fixture.AddTicketAsync(TicketStatus.Open);
        ticket.RequesterEmployeeId = fixture.SupervisorId;
        await fixture.Db.SaveChangesAsync();
        fixture.Db.ChangeTracker.Clear();

        // จ่ายงานเข้าตัวเอง
        var assign = new AssignTicketHandler(
            fixture.Db, Manager(fixture), Permissions(), new TestAuditLogService(),
            Options.Create(new TicketOptions()));
        await assign.Handle(
            new AssignTicketCommand(ticket.Id, fixture.SupervisorId, "ดำเนินการเอง", null), default);
        fixture.Db.ChangeTracker.Clear();

        var assigned = await fixture.Db.Tickets.FirstAsync(item => item.Id == ticket.Id);
        var afterAssign = await TicketAccess.GetActionFlagsAsync(
            fixture.Db, Manager(fixture), Permissions(), assigned, default);
        afterAssign.IsTeamOwner.Should().BeTrue();
        afterAssign.CanStart.Should().BeTrue();

        // เริ่มงานเองได้
        var start = new StartTicketWorkHandler(
            fixture.Db, Manager(fixture), Permissions(), new TestAuditLogService(),
            Options.Create(new TicketOptions()));
        await start.Handle(new StartTicketWorkCommand(ticket.Id, null), default);
        fixture.Db.ChangeTracker.Clear();

        var inProgress = await fixture.Db.Tickets.FirstAsync(item => item.Id == ticket.Id);
        var afterStart = await TicketAccess.GetActionFlagsAsync(
            fixture.Db, Manager(fixture), Permissions(), inProgress, default);
        inProgress.Status.Should().Be(TicketStatus.InProgress);
        afterStart.CanResolve.Should().BeTrue();
        afterStart.CanManageTeam.Should().BeTrue();
        // บันทึกภายในของแผนกตัวเองต้องทั้งเพิ่มได้และมองเห็นได้ ไม่ใช่เพิ่มได้แต่ดูไม่ได้
        afterStart.CanAddInternalNote.Should().BeTrue();
    }

    [Fact]
    public async Task PlainRequester_ShouldStillBeBlockedFromReceiverSide()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var ticket = await fixture.AddTicketAsync(TicketStatus.Assigned);
        // ผู้แจ้ง (พนักงานทั่วไป) ถูกจ่ายงานใบของตัวเอง — ยังต้องทำงานฝั่งผู้รับไม่ได้
        await fixture.AddTeamMemberAsync(ticket.Id, fixture.RequesterId);
        var assignment = await fixture.Db.TicketAssignments
            .FirstAsync(item => item.TicketId == ticket.Id);
        assignment.IsPrimary = true;
        assignment.MemberRole = TicketAssignmentRole.Owner;
        assignment.ActiveSlot = "Primary";
        await fixture.Db.SaveChangesAsync();
        fixture.Db.ChangeTracker.Clear();

        var requester = new TestCurrentUser(
            fixture.RequesterId, fixture.CompanyId, fixture.SourceDepartmentId, RoleType.Employee);
        var flags = await TicketAccess.GetActionFlagsAsync(
            fixture.Db, requester, Permissions(),
            await fixture.Db.Tickets.FirstAsync(item => item.Id == ticket.Id), default);

        flags.IsRequester.Should().BeTrue();
        flags.CanStart.Should().BeFalse();
        flags.CanResolve.Should().BeFalse();
        flags.CanAssign.Should().BeFalse();
        flags.CanManageTeam.Should().BeFalse();
        flags.CanAddInternalNote.Should().BeFalse();
    }

    [Fact]
    public async Task ReassignAfterWorkStarted_ShouldRequireReason()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var ticket = await fixture.AddTicketAsync(TicketStatus.InProgress, true);
        var handler = new AssignTicketHandler(
            fixture.Db, Manager(fixture), Permissions(), new TestAuditLogService(),
            Options.Create(new TicketOptions()));

        // ไม่ใส่เหตุผล = ถูกปฏิเสธ (ฟอร์มทั้ง admin/liff ต้องกำกับดอกจันไว้ ไม่ให้ผู้ใช้เจอ error หลังกด)
        var missingReason = await Assert.ThrowsAsync<BadRequestException>(() => handler.Handle(
            new AssignTicketCommand(ticket.Id, fixture.SupervisorId, null, null), default));
        missingReason.Code.Should().Be("TICKET_REASSIGN_REASON_REQUIRED");

        // ใส่เหตุผลแล้วเปลี่ยนมาเป็นตัวเองได้
        await handler.Handle(
            new AssignTicketCommand(ticket.Id, fixture.SupervisorId, "ขอรับไปทำเอง", null), default);
        var owner = await fixture.Db.TicketAssignments.AsNoTracking()
            .FirstAsync(item => item.TicketId == ticket.Id && item.IsActive && item.IsPrimary);
        owner.AssignedToEmployeeId.Should().Be(fixture.SupervisorId);
    }

    [Fact]
    public async Task AssignToSelf_FromOpen_ShouldNotRequireReason()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var ticket = await fixture.AddTicketAsync(TicketStatus.Open);
        var handler = new AssignTicketHandler(
            fixture.Db, Manager(fixture), Permissions(), new TestAuditLogService(),
            Options.Create(new TicketOptions()));

        var result = await handler.Handle(
            new AssignTicketCommand(ticket.Id, fixture.SupervisorId, null, null), default);

        result.Status.Should().Be(TicketStatus.Assigned);
    }

    [Fact]
    public async Task TeamMemberOfManagerOwnTicket_ShouldStillWork()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var ticket = await fixture.AddTicketAsync(TicketStatus.Assigned);
        ticket.RequesterEmployeeId = fixture.SupervisorId;
        await fixture.Db.SaveChangesAsync();
        var assign = new AssignTicketHandler(
            fixture.Db, Manager(fixture), Permissions(), new TestAuditLogService(),
            Options.Create(new TicketOptions()));
        await assign.Handle(
            new AssignTicketCommand(ticket.Id, fixture.SupervisorId, "ทำเอง", null), default);
        fixture.Db.ChangeTracker.Clear();

        var helperId = await fixture.AddEmployeeAsync("Helper");
        var addMembers = new AddTicketTeamMembersHandler(
            fixture.Db, Manager(fixture), Permissions(), new TestAuditLogService(),
            Options.Create(new TicketOptions()));
        await addMembers.Handle(
            new AddTicketTeamMembersCommand(ticket.Id, [helperId], "ช่วยงาน", null), default);
        fixture.Db.ChangeTracker.Clear();

        var start = new StartTicketWorkHandler(
            fixture.Db, Employee(fixture, helperId), Permissions(), new TestAuditLogService(),
            Options.Create(new TicketOptions()));
        var result = await start.Handle(new StartTicketWorkCommand(ticket.Id, null), default);

        result.Status.Should().Be(TicketStatus.InProgress);
    }
}
