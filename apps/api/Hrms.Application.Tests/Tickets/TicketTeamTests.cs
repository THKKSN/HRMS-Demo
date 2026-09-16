using FluentAssertions;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Options;
using Hrms.Application.Features.TicketReports;
using Hrms.Application.Features.Tickets.Commands;
using Hrms.Application.Features.Tickets.Queries;
using Hrms.Application.Tests.Support;
using Hrms.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Hrms.Application.Tests.Tickets;

/// <summary>
/// ทีมงานในใบแจ้งเรื่อง — Owner (ผู้รับผิดชอบหลัก) 1 คน + Member (ผู้ร่วมงาน) หลายคน
/// เก็บในตาราง ticket_assignments แถวเดียวกัน แยกด้วย MemberRole/IsPrimary
/// </summary>
public class TicketTeamTests
{
    private const string WorkPermission = "ticket:update-status";
    private const string ResolvePermission = "ticket:resolve";
    private const string ManageTeamPermission = "ticket:manage-team";
    private const string WorkAsMemberPermission = "ticket:work-as-team-member";

    [Fact]
    public async Task Member_ShouldBeAbleToStartWorkLikeOwner()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var ticket = await fixture.AddTicketAsync(TicketStatus.Assigned, true);
        var memberId = await fixture.AddEmployeeAsync("Member");
        await fixture.AddTeamMemberAsync(ticket.Id, memberId);

        var handler = new StartTicketWorkHandler(
            fixture.Db,
            Member(fixture, memberId),
            new TestPermissionService(WorkPermission, WorkAsMemberPermission),
            new TestAuditLogService(),
            Options.Create(new TicketOptions()));
        var result = await handler.Handle(new StartTicketWorkCommand(ticket.Id, null), default);

        result.Status.Should().Be(TicketStatus.InProgress);
    }

    [Fact]
    public async Task Member_WithoutTeamPermission_ShouldNotBeAbleToStartWork()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var ticket = await fixture.AddTicketAsync(TicketStatus.Assigned, true);
        var memberId = await fixture.AddEmployeeAsync("Member");
        await fixture.AddTeamMemberAsync(ticket.Id, memberId);

        // มี permission ของ action แต่ไม่มี ticket:work-as-team-member → ถือว่าไม่ใช่คนทำงานของใบนี้
        var handler = new StartTicketWorkHandler(
            fixture.Db,
            Member(fixture, memberId),
            new TestPermissionService(WorkPermission),
            new TestAuditLogService(),
            Options.Create(new TicketOptions()));

        await Assert.ThrowsAsync<AppForbiddenException>(() =>
            handler.Handle(new StartTicketWorkCommand(ticket.Id, null), default));
    }

    [Fact]
    public async Task Member_ShouldNotBeAbleToResolve_OnlyOwnerCan()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var ticket = await fixture.AddTicketAsync(TicketStatus.InProgress, true);
        var reason = await fixture.AddCloseoutReasonAsync();
        ticket.CloseoutReasonId = reason.Id;
        ticket.CloseoutReasonNameSnapshot = reason.Name;
        ticket.ResolutionNote = "แก้ไขเรียบร้อย";
        await fixture.Db.SaveChangesAsync();
        var memberId = await fixture.AddEmployeeAsync("Member");
        await fixture.AddTeamMemberAsync(ticket.Id, memberId);
        fixture.Db.TicketAttachments.Add(new Hrms.Domain.Entities.TicketAttachment
        {
            TicketId = ticket.Id,
            Url = "/uploads/tickets/after.jpg",
            FileName = "after.jpg",
            ContentType = "image/jpeg",
            SizeBytes = 1024,
            Stage = TicketAttachmentStage.Resolved,
            UploadedByEmployeeId = fixture.AssigneeId
        });
        await fixture.Db.SaveChangesAsync();
        fixture.Db.ChangeTracker.Clear();

        var permissions = new TestPermissionService(ResolvePermission, WorkAsMemberPermission);
        var memberHandler = new ResolveTicketHandler(
            fixture.Db, Member(fixture, memberId), permissions, new TestAuditLogService());
        await Assert.ThrowsAsync<AppForbiddenException>(() =>
            memberHandler.Handle(new ResolveTicketCommand(ticket.Id, null), default));

        var ownerHandler = new ResolveTicketHandler(
            fixture.Db, Owner(fixture), permissions, new TestAuditLogService());
        var result = await ownerHandler.Handle(new ResolveTicketCommand(ticket.Id, null), default);
        result.Status.Should().Be(TicketStatus.Resolved);
    }

    [Fact]
    public async Task ChangingOwner_ShouldKeepTeamMembersActive()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var ticket = await fixture.AddTicketAsync(TicketStatus.Assigned, true);
        var memberId = await fixture.AddEmployeeAsync("Member");
        await fixture.AddTeamMemberAsync(ticket.Id, memberId);
        var newOwnerId = await fixture.AddEmployeeAsync("NewOwner");

        var handler = new AssignTicketHandler(
            fixture.Db,
            Supervisor(fixture),
            new TestPermissionService("ticket:assign"),
            new TestAuditLogService(),
            Options.Create(new TicketOptions()));
        await handler.Handle(new AssignTicketCommand(ticket.Id, newOwnerId, "เปลี่ยนเจ้าภาพ", null), default);

        var assignments = await fixture.Db.TicketAssignments.AsNoTracking()
            .Where(a => a.TicketId == ticket.Id)
            .ToListAsync();
        assignments.Single(a => a.AssignedToEmployeeId == memberId).IsActive.Should().BeTrue();
        assignments.Single(a => a.AssignedToEmployeeId == newOwnerId && a.IsActive)
            .MemberRole.Should().Be(TicketAssignmentRole.Owner);
        assignments.Single(a => a.AssignedToEmployeeId == fixture.AssigneeId).IsActive.Should().BeFalse();
    }

    [Fact]
    public async Task RemovedMember_ShouldLoseWorkAccessButKeepViewAccess()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var ticket = await fixture.AddTicketAsync(TicketStatus.InProgress, true);
        var memberId = await fixture.AddEmployeeAsync("Member");
        await fixture.AddTeamMemberAsync(ticket.Id, memberId);

        var remove = new RemoveTicketTeamMemberHandler(
            fixture.Db,
            Owner(fixture),
            new TestPermissionService(ManageTeamPermission),
            new TestAuditLogService());
        await remove.Handle(new RemoveTicketTeamMemberCommand(ticket.Id, memberId, null), default);

        var removed = await fixture.Db.TicketAssignments.AsNoTracking()
            .SingleAsync(a => a.TicketId == ticket.Id && a.AssignedToEmployeeId == memberId);
        removed.IsActive.Should().BeFalse();
        removed.EndedAt.Should().NotBeNull();

        // ทำงานต่อไม่ได้
        var work = new StartTicketWorkHandler(
            fixture.Db,
            Member(fixture, memberId),
            new TestPermissionService(WorkPermission, WorkAsMemberPermission),
            new TestAuditLogService(),
            Options.Create(new TicketOptions()));
        await Assert.ThrowsAsync<AppForbiddenException>(() =>
            work.Handle(new StartTicketWorkCommand(ticket.Id, null), default));

        // แต่ยังเปิดดูใบเดิมที่ตัวเองเคยทำได้
        var detail = new GetTicketDetailHandler(
            fixture.Db,
            Member(fixture, memberId),
            new TestPermissionService("ticket:view-assigned"),
            new Hrms.Application.Features.Tickets.TicketRequesterResolver());
        var dto = await detail.Handle(new GetTicketDetailQuery(ticket.Id), default);
        dto.Id.Should().Be(ticket.Id);
        dto.TeamMembers.Should().OnlyContain(member => member.EmployeeId == fixture.AssigneeId);
    }

    [Fact]
    public async Task AddMembers_ShouldRejectWhenExceedingMaxTeamMembers()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var ticket = await fixture.AddTicketAsync(TicketStatus.InProgress, true);
        var first = await fixture.AddEmployeeAsync("MemberA");
        var second = await fixture.AddEmployeeAsync("MemberB");
        var third = await fixture.AddEmployeeAsync("MemberC");

        var handler = new AddTicketTeamMembersHandler(
            fixture.Db,
            Owner(fixture),
            new TestPermissionService(ManageTeamPermission),
            new TestAuditLogService(),
            Options.Create(new TicketOptions { MaxTeamMembers = 2 }));

        await handler.Handle(new AddTicketTeamMembersCommand(ticket.Id, [first, second], null, null), default);
        var error = await Assert.ThrowsAsync<ConflictException>(() =>
            handler.Handle(new AddTicketTeamMembersCommand(ticket.Id, [third], null, null), default));

        error.Code.Should().Be("TEAM_LIMIT_REACHED");
        (await fixture.Db.TicketAssignments.CountAsync(a =>
            a.TicketId == ticket.Id && a.IsActive && !a.IsPrimary)).Should().Be(2);
    }

    [Fact]
    public async Task AddMembers_ShouldRejectRequesterAndExistingOwner()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var ticket = await fixture.AddTicketAsync(TicketStatus.InProgress, true);
        var handler = new AddTicketTeamMembersHandler(
            fixture.Db,
            Owner(fixture),
            new TestPermissionService(ManageTeamPermission),
            new TestAuditLogService(),
            Options.Create(new TicketOptions()));

        var requesterRejected = await Assert.ThrowsAsync<BadRequestException>(() =>
            handler.Handle(new AddTicketTeamMembersCommand(ticket.Id, [fixture.RequesterId], null, null), default));
        requesterRejected.Code.Should().Be("TICKET_TEAM_REQUESTER_NOT_ALLOWED");
        var ownerRejected = await Assert.ThrowsAsync<BadRequestException>(() =>
            handler.Handle(new AddTicketTeamMembersCommand(ticket.Id, [fixture.AssigneeId], null, null), default));
        ownerRejected.Code.Should().Be("TICKET_TEAM_OWNER_ALREADY_MEMBER");
    }

    [Fact]
    public async Task AddMembers_ShouldNotifyEveryMemberWithUniqueDeduplicationKey()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var ticket = await fixture.AddTicketAsync(TicketStatus.InProgress, true);
        var first = await fixture.AddEmployeeAsync("MemberA");
        var second = await fixture.AddEmployeeAsync("MemberB");

        var handler = new AddTicketTeamMembersHandler(
            fixture.Db,
            Supervisor(fixture),
            new TestPermissionService(ManageTeamPermission),
            new TestAuditLogService(),
            Options.Create(new TicketOptions()));
        await handler.Handle(new AddTicketTeamMembersCommand(ticket.Id, [first, second], "ช่วยงานติดตั้ง", null), default);

        var outbox = await fixture.Db.NotificationOutboxes.AsNoTracking()
            .Where(item => item.EntityId == ticket.Id && item.EventType == "TicketTeamMemberAdded")
            .ToListAsync();
        // ผู้ร่วมงานใหม่ 2 คน + ผู้รับผิดชอบหลักที่ต้องรู้ว่ามีคนเข้าทีม = 3
        outbox.Should().HaveCount(3);
        outbox.Select(item => item.RecipientEmployeeId)
            .Should().BeEquivalentTo([first, second, (Guid?)fixture.AssigneeId]);
        outbox.Select(item => item.DeduplicationKey).Should().OnlyHaveUniqueItems();
    }

    [Fact]
    public async Task ReturnForRevision_ShouldNotifyOwnerAndMembers()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var ticket = await fixture.AddTicketAsync(TicketStatus.Resolved, true);
        var memberId = await fixture.AddEmployeeAsync("Member");
        await fixture.AddTeamMemberAsync(ticket.Id, memberId);

        var handler = new ReturnTicketForRevisionHandler(
            fixture.Db,
            Supervisor(fixture),
            new TestPermissionService("ticket:return"),
            new TestAuditLogService(),
            Options.Create(new TicketOptions()));
        await handler.Handle(new ReturnTicketForRevisionCommand(ticket.Id, "แก้ไม่ครบ", null), default);

        var recipients = await fixture.Db.NotificationOutboxes.AsNoTracking()
            .Where(item => item.EntityId == ticket.Id && item.EventType == "TicketReturned")
            .Select(item => item.RecipientEmployeeId)
            .ToListAsync();
        recipients.Should().Contain(fixture.AssigneeId).And.Contain(memberId);
    }

    [Fact]
    public async Task ReturnForRevision_ShouldNotifyOwnerOnly_WhenEventNotInTeamList()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var ticket = await fixture.AddTicketAsync(TicketStatus.Resolved, true);
        var memberId = await fixture.AddEmployeeAsync("Member");
        await fixture.AddTeamMemberAsync(ticket.Id, memberId);

        // ถอด TicketReturned ออกจากรายการ event ของทีม → ผู้ร่วมงานต้องไม่ได้รับ
        var handler = new ReturnTicketForRevisionHandler(
            fixture.Db,
            Supervisor(fixture),
            new TestPermissionService("ticket:return"),
            new TestAuditLogService(),
            Options.Create(new TicketOptions { TeamNotificationEvents = ["TicketTeamMemberAdded"] }));
        await handler.Handle(new ReturnTicketForRevisionCommand(ticket.Id, "แก้ไม่ครบ", null), default);

        var recipients = await fixture.Db.NotificationOutboxes.AsNoTracking()
            .Where(item => item.EntityId == ticket.Id && item.EventType == "TicketReturned")
            .Select(item => item.RecipientEmployeeId)
            .ToListAsync();
        recipients.Should().Contain(fixture.AssigneeId).And.NotContain(memberId);
    }

    [Fact]
    public async Task WorkloadReport_ShouldCountOwnerOnly()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var ticket = await fixture.AddTicketAsync(TicketStatus.Closed, true);
        ticket.ClosedAt = DateTime.UtcNow.AddHours(7);
        ticket.WorkStartedAt = ticket.CreatedAt;
        ticket.ResolvedAt = ticket.ClosedAt;
        await fixture.Db.SaveChangesAsync();
        var memberId = await fixture.AddEmployeeAsync("Member");
        await fixture.AddTeamMemberAsync(ticket.Id, memberId);

        var handler = new GetTicketWorkloadReportHandler(
            fixture.Db, Admin(fixture), new TestPermissionService("ticket:view-report"));
        var filter = new TicketReportFilter(
            null, null, null, null, null, null, null, null, null, null, null);
        var rows = await handler.Handle(new GetTicketWorkloadReportQuery(filter), default);

        rows.Should().HaveCount(1);
        rows[0].EmployeeId.Should().Be(fixture.AssigneeId);
        rows[0].ClosedCount.Should().Be(1);
    }

    [Fact]
    public async Task Detail_ShouldExposeTeamAndManageFlagsForOwner()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var ticket = await fixture.AddTicketAsync(TicketStatus.InProgress, true);
        var memberId = await fixture.AddEmployeeAsync("Member");
        await fixture.AddTeamMemberAsync(ticket.Id, memberId);

        var handler = new GetTicketDetailHandler(
            fixture.Db,
            Owner(fixture),
            new TestPermissionService("ticket:view-assigned", ManageTeamPermission),
            new Hrms.Application.Features.Tickets.TicketRequesterResolver());
        var dto = await handler.Handle(new GetTicketDetailQuery(ticket.Id), default);

        dto.Actions.IsTeamOwner.Should().BeTrue();
        dto.Actions.IsTeamMember.Should().BeFalse();
        dto.Actions.CanManageTeam.Should().BeTrue();
        dto.TeamMembers.Should().HaveCount(2);
        dto.TeamMembers[0].MemberRole.Should().Be(TicketAssignmentRole.Owner);
        dto.TeamMembers[0].CanRemove.Should().BeFalse();
        dto.TeamMembers[1].EmployeeId.Should().Be(memberId);
        dto.TeamMembers[1].CanRemove.Should().BeTrue();
    }

    [Fact]
    public async Task Requester_ShouldNotBeAbleToManageTeam()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var ticket = await fixture.AddTicketAsync(TicketStatus.InProgress, true);
        var memberId = await fixture.AddEmployeeAsync("Member");

        var handler = new AddTicketTeamMembersHandler(
            fixture.Db,
            new TestCurrentUser(fixture.RequesterId, fixture.CompanyId, fixture.SourceDepartmentId, RoleType.Employee),
            new TestPermissionService(ManageTeamPermission),
            new TestAuditLogService(),
            Options.Create(new TicketOptions()));

        await Assert.ThrowsAsync<AppForbiddenException>(() =>
            handler.Handle(new AddTicketTeamMembersCommand(ticket.Id, [memberId], null, null), default));
    }

    [Fact]
    public async Task TemplateOptions_ShouldCountOnlyAddableMembersAndRespectScope()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var ticket = await fixture.AddTicketAsync(TicketStatus.InProgress, true);
        var member = await fixture.AddEmployeeAsync("MemberA");
        var outsider = await fixture.AddEmployeeAsync("MemberB");
        await fixture.AddTeamMemberAsync(ticket.Id, member);

        // template ของแผนกปลายทาง: มี owner + member ที่อยู่ในทีมแล้ว + ผู้แจ้ง + คนใหม่ 1 คน → เพิ่มได้ 1
        fixture.Db.TicketTeamTemplates.AddRange(
            Template(fixture, "ทีมแผนก", fixture.TargetDepartmentId,
                [fixture.AssigneeId, member, fixture.RequesterId, outsider]),
            Template(fixture, "ทีมทั้งบริษัท", null, [outsider]),
            Template(fixture, "ทีมแผนกอื่น", fixture.SourceDepartmentId, [outsider]),
            Template(fixture, "ทีมปิดใช้งาน", fixture.TargetDepartmentId, [outsider], isActive: false));
        await fixture.Db.SaveChangesAsync();
        fixture.Db.ChangeTracker.Clear();

        var handler = new GetTicketTeamTemplateOptionsHandler(
            fixture.Db, Owner(fixture), new TestPermissionService("ticket:view-assigned"));
        var options = await handler.Handle(new GetTicketTeamTemplateOptionsQuery(ticket.Id), default);

        options.Select(option => option.Name).Should().BeEquivalentTo(["ทีมแผนก", "ทีมทั้งบริษัท"]);
        options.Single(option => option.Name == "ทีมแผนก").MemberCount.Should().Be(4);
        options.Single(option => option.Name == "ทีมแผนก").AddableCount.Should().Be(1);
        options.Single(option => option.Name == "ทีมทั้งบริษัท").IsCompanyWide.Should().BeTrue();
    }

    [Fact]
    public async Task CreateTemplate_ShouldRejectMemberFromAnotherCompany()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var otherCompanyId = Guid.NewGuid();
        fixture.Db.Companies.Add(new Hrms.Domain.Entities.Company
        {
            Id = otherCompanyId, Name = "Other Company", IsActive = true
        });
        var strangerId = Guid.NewGuid();
        fixture.Db.Employees.Add(new Hrms.Domain.Entities.Employee
        {
            Id = strangerId,
            CompanyId = otherCompanyId,
            EmployeeCode = "OTHER01",
            FirstName = "Stranger",
            LastName = "Test",
            IsActive = true
        });
        await fixture.Db.SaveChangesAsync();
        fixture.Db.ChangeTracker.Clear();

        var handler = new CreateTicketTeamTemplateHandler(
            fixture.Db,
            Supervisor(fixture),
            new TestPermissionService("ticket:manage-team-templates"),
            new TestAuditLogService());

        var rejected = await Assert.ThrowsAsync<BadRequestException>(() => handler.Handle(
            new CreateTicketTeamTemplateCommand(
                fixture.CompanyId, fixture.TargetDepartmentId, "ทีมข้ามบริษัท", null, 10, [strangerId]),
            default));
        rejected.Code.Should().Be("TICKET_TEAM_TEMPLATE_MEMBER_INVALID");
    }

    [Fact]
    public async Task CreateTemplate_ShouldRejectDuplicatedNameInSameScope()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var handler = new CreateTicketTeamTemplateHandler(
            fixture.Db,
            Supervisor(fixture),
            new TestPermissionService("ticket:manage-team-templates"),
            new TestAuditLogService());
        var command = new CreateTicketTeamTemplateCommand(
            fixture.CompanyId, fixture.TargetDepartmentId, "ทีมติดตั้ง", null, 10, [fixture.AssigneeId]);

        await handler.Handle(command, default);
        var error = await Assert.ThrowsAsync<ConflictException>(() => handler.Handle(command, default));
        error.Code.Should().Be("TEAM_TEMPLATE_DUPLICATED");
    }

    private static Hrms.Domain.Entities.TicketTeamTemplate Template(
        TicketTestFixture fixture,
        string name,
        Guid? departmentId,
        Guid[] employeeIds,
        bool isActive = true)
    {
        var template = new Hrms.Domain.Entities.TicketTeamTemplate
        {
            CompanyId = fixture.CompanyId,
            DepartmentId = departmentId,
            Name = name,
            IsActive = isActive,
            SortOrder = 10
        };
        foreach (var employeeId in employeeIds)
        {
            template.Members.Add(new Hrms.Domain.Entities.TicketTeamTemplateMember
            {
                TemplateId = template.Id,
                EmployeeId = employeeId
            });
        }
        return template;
    }

    private static TestCurrentUser Owner(TicketTestFixture fixture)
        => new(fixture.AssigneeId, fixture.CompanyId, fixture.TargetDepartmentId, RoleType.Employee);

    private static TestCurrentUser Member(TicketTestFixture fixture, Guid employeeId)
        => new(employeeId, fixture.CompanyId, fixture.TargetDepartmentId, RoleType.Employee);

    private static TestCurrentUser Supervisor(TicketTestFixture fixture)
        => new(fixture.SupervisorId, fixture.CompanyId, fixture.TargetDepartmentId, RoleType.Supervisor);

    private static TestCurrentUser Admin(TicketTestFixture fixture)
        => new(fixture.SupervisorId, fixture.CompanyId, fixture.TargetDepartmentId, RoleType.Admin);
}
