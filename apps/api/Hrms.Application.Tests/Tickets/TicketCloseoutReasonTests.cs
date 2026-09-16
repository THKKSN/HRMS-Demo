using FluentAssertions;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Features.Tickets.Commands;
using Hrms.Application.Features.Tickets.Queries;
using Hrms.Application.Tests.Support;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Tests.Tickets;

public class TicketCloseoutReasonTests
{
    [Fact]
    public async Task Options_ShouldIncludeCompanyWideDepartmentAndMatchingCategoryReasonsOnly()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var ticket = await fixture.AddTicketAsync(TicketStatus.InProgress, true);
        var companyWide = await fixture.AddCloseoutReasonAsync("อื่น ๆ");
        var departmentOnly = await fixture.AddCloseoutReasonAsync("เปลี่ยนอะไหล่", true);
        var matchingCategory = await fixture.AddCloseoutReasonAsync("กล้องหลุด", true, fixture.CategoryId);
        var otherCategoryId = Guid.NewGuid();
        fixture.Db.TicketCategories.Add(new TicketCategory
        {
            Id = otherCategoryId,
            CompanyId = fixture.CompanyId,
            DepartmentId = fixture.TargetDepartmentId,
            Name = "Software",
            IsActive = true
        });
        await fixture.Db.SaveChangesAsync();
        await fixture.AddCloseoutReasonAsync("บั๊กโปรแกรม", true, otherCategoryId);
        fixture.Db.TicketCloseoutReasons.AddRange(
            new TicketCloseoutReason { CompanyId = fixture.CompanyId, DepartmentId = fixture.SourceDepartmentId, Name = "ของแผนกอื่น", IsActive = true },
            new TicketCloseoutReason { CompanyId = fixture.CompanyId, DepartmentId = null, Name = "ปิดใช้แล้ว", IsActive = false });
        await fixture.Db.SaveChangesAsync();
        fixture.Db.ChangeTracker.Clear();

        var handler = new GetTicketCloseoutReasonOptionsHandler(
            fixture.Db, Worker(fixture), new TestPermissionService("ticket:view-assigned"));
        var options = await handler.Handle(new GetTicketCloseoutReasonOptionsQuery(ticket.Id), default);

        options.Select(option => option.Id).Should().BeEquivalentTo([companyWide.Id, departmentOnly.Id, matchingCategory.Id]);
        options.Single(option => option.Id == companyWide.Id).IsCompanyWide.Should().BeTrue();
        options.Should().OnlyContain(option => !option.IsLegacySelection);
    }

    [Fact]
    public async Task Options_ShouldKeepCurrentSelectionEvenWhenDeactivated()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var ticket = await fixture.AddTicketAsync(TicketStatus.InProgress, true);
        var selected = await fixture.AddCloseoutReasonAsync("เลิกใช้แล้ว");
        ticket.CloseoutReasonId = selected.Id;
        ticket.CloseoutReasonNameSnapshot = selected.Name;
        selected.IsActive = false;
        await fixture.Db.SaveChangesAsync();
        fixture.Db.ChangeTracker.Clear();

        var handler = new GetTicketCloseoutReasonOptionsHandler(
            fixture.Db, Worker(fixture), new TestPermissionService("ticket:view-assigned"));
        var options = await handler.Handle(new GetTicketCloseoutReasonOptionsQuery(ticket.Id), default);

        var legacy = options.Should().ContainSingle().Subject;
        legacy.Id.Should().Be(selected.Id);
        legacy.IsLegacySelection.Should().BeTrue();
    }

    [Fact]
    public async Task UpdateWorkDetail_ShouldStoreSnapshotAndSyncLegacyEnum()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var ticket = await fixture.AddTicketAsync(TicketStatus.InProgress, true);
        var reason = await fixture.AddCloseoutReasonAsync("ระบบบกพร่อง");
        reason.LegacyProblemType = "SystemDefect";
        await fixture.Db.SaveChangesAsync();
        fixture.Db.ChangeTracker.Clear();

        var handler = new UpdateTicketWorkDetailHandler(
            fixture.Db, Worker(fixture), new TestPermissionService("ticket:update-status"), new TestAuditLogService());
        await handler.Handle(
            new UpdateTicketWorkDetailCommand(ticket.Id, null, null, "แก้แล้ว", reason.Id, ticket.UpdatedAt), default);

        var saved = await fixture.Db.Tickets.AsNoTracking().SingleAsync(x => x.Id == ticket.Id);
        saved.CloseoutReasonId.Should().Be(reason.Id);
        saved.CloseoutReasonNameSnapshot.Should().Be("ระบบบกพร่อง");
        saved.ProblemType.Should().Be(TicketProblemType.SystemDefect);
    }

    [Fact]
    public async Task UpdateWorkDetail_ShouldRejectReasonScopedToAnotherDepartment()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var ticket = await fixture.AddTicketAsync(TicketStatus.InProgress, true);
        var otherDepartment = new TicketCloseoutReason
        {
            CompanyId = fixture.CompanyId,
            DepartmentId = fixture.SourceDepartmentId,
            Name = "ของแผนกอื่น",
            IsActive = true
        };
        fixture.Db.TicketCloseoutReasons.Add(otherDepartment);
        await fixture.Db.SaveChangesAsync();
        fixture.Db.ChangeTracker.Clear();

        var handler = new UpdateTicketWorkDetailHandler(
            fixture.Db, Worker(fixture), new TestPermissionService("ticket:update-status"), new TestAuditLogService());
        var act = () => handler.Handle(
            new UpdateTicketWorkDetailCommand(ticket.Id, null, null, "แก้แล้ว", otherDepartment.Id, ticket.UpdatedAt), default);

        await act.Should().ThrowAsync<BadRequestException>()
            .Where(e => e.Code == "TICKET_CLOSEOUT_REASON_DEPARTMENT_MISMATCH");
        (await fixture.Db.Tickets.AsNoTracking().SingleAsync(x => x.Id == ticket.Id)).CloseoutReasonId.Should().BeNull();
    }

    [Fact]
    public async Task Resolve_ShouldRequireCloseoutReason()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var ticket = await fixture.AddTicketAsync(TicketStatus.InProgress, true);
        ticket.ResolutionNote = "Reattached the camera";
        fixture.Db.TicketAttachments.Add(new TicketAttachment
        {
            TicketId = ticket.Id,
            UploadedByEmployeeId = fixture.AssigneeId,
            Url = "/protected/evidence.jpg",
            FileName = "evidence.jpg",
            ContentType = "image/jpeg",
            SizeBytes = 100,
            Stage = TicketAttachmentStage.Resolved,
            Visibility = TicketAttachmentVisibility.Public
        });
        await fixture.Db.SaveChangesAsync();

        var handler = new ResolveTicketHandler(
            fixture.Db, Worker(fixture), new TestPermissionService("ticket:resolve"), new TestAuditLogService());
        var act = () => handler.Handle(new ResolveTicketCommand(ticket.Id, ticket.UpdatedAt), default);

        await act.Should().ThrowAsync<BadRequestException>()
            .Where(e => e.Code == "TICKET_CLOSEOUT_REASON_REQUIRED");
        (await fixture.Db.Tickets.SingleAsync(x => x.Id == ticket.Id)).Status.Should().Be(TicketStatus.InProgress);
    }

    [Fact]
    public async Task Resolve_ShouldSkipEvidenceWhenReasonDoesNotRequireIt()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var ticket = await fixture.AddTicketAsync(TicketStatus.InProgress, true);
        var reason = await fixture.AddCloseoutReasonAsync("ไม่พบปัญหา");
        reason.RequiresCompletionEvidence = false;
        ticket.CloseoutReasonId = reason.Id;
        ticket.CloseoutReasonNameSnapshot = reason.Name;
        ticket.ResolutionNote = "ตรวจแล้วอุปกรณ์ทำงานปกติ";
        await fixture.Db.SaveChangesAsync();

        var handler = new ResolveTicketHandler(
            fixture.Db, Worker(fixture), new TestPermissionService("ticket:resolve"), new TestAuditLogService());
        var result = await handler.Handle(new ResolveTicketCommand(ticket.Id, ticket.UpdatedAt), default);

        result.Status.Should().Be(TicketStatus.Resolved);
    }

    [Fact]
    public async Task Resolve_ShouldSkipNoteWhenReasonDoesNotRequireIt()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var ticket = await fixture.AddTicketAsync(TicketStatus.InProgress, true);
        var reason = await fixture.AddCloseoutReasonAsync("แก้ไขหน้างานทันที");
        reason.RequiresResolutionNote = false;
        ticket.CloseoutReasonId = reason.Id;
        ticket.CloseoutReasonNameSnapshot = reason.Name;
        fixture.Db.TicketAttachments.Add(new TicketAttachment
        {
            TicketId = ticket.Id,
            UploadedByEmployeeId = fixture.AssigneeId,
            Url = "/protected/evidence.jpg",
            FileName = "evidence.jpg",
            ContentType = "image/jpeg",
            SizeBytes = 100,
            Stage = TicketAttachmentStage.Resolved,
            Visibility = TicketAttachmentVisibility.Public
        });
        await fixture.Db.SaveChangesAsync();

        var handler = new ResolveTicketHandler(
            fixture.Db, Worker(fixture), new TestPermissionService("ticket:resolve"), new TestAuditLogService());
        var result = await handler.Handle(new ResolveTicketCommand(ticket.Id, ticket.UpdatedAt), default);

        result.Status.Should().Be(TicketStatus.Resolved);
        (await fixture.Db.Tickets.AsNoTracking().SingleAsync(x => x.Id == ticket.Id)).ResolutionNote.Should().BeNull();
    }

    [Fact]
    public async Task CreateReason_ShouldRejectDuplicateNameInSameScope()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var supervisor = new TestCurrentUser(
            fixture.SupervisorId, fixture.CompanyId, fixture.TargetDepartmentId, RoleType.Supervisor);
        var handler = new CreateTicketCloseoutReasonHandler(
            fixture.Db, supervisor, new TestPermissionService("ticket:manage-closeout-reasons"), new TestAuditLogService());

        var created = await handler.Handle(
            new CreateTicketCloseoutReasonCommand(
                fixture.CompanyId, fixture.TargetDepartmentId, "เปลี่ยนอะไหล่", null, 10, [fixture.CategoryId]),
            default);
        var act = () => handler.Handle(
            new CreateTicketCloseoutReasonCommand(
                fixture.CompanyId, fixture.TargetDepartmentId, " เปลี่ยนอะไหล่ ", null, 20, null),
            default);

        created.CategoryIds.Should().Equal(fixture.CategoryId);
        await act.Should().ThrowAsync<ConflictException>();
    }

    private static TestCurrentUser Worker(TicketTestFixture fixture)
        => new(
            fixture.AssigneeId,
            fixture.CompanyId,
            fixture.TargetDepartmentId,
            RoleType.Employee);
}
