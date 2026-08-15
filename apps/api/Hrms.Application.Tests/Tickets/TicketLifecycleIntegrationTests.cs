using FluentAssertions;
using Hrms.Application.Features.Tickets.Commands;
using Hrms.Application.Tests.Support;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Tests.Tickets;

public class TicketLifecycleIntegrationTests
{
    [Fact]
    public async Task StartWork_ShouldChangeStatusAndQueueNotification()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var ticket = await fixture.AddTicketAsync(TicketStatus.Assigned, true);
        var handler = new StartTicketWorkHandler(
            fixture.Db,
            Worker(fixture),
            new TestPermissionService("ticket:update-status"),
            new TestAuditLogService());

        await handler.Handle(new StartTicketWorkCommand(ticket.Id, ticket.UpdatedAt), default);

        var saved = await fixture.Db.Tickets.SingleAsync(x => x.Id == ticket.Id);
        saved.Status.Should().Be(TicketStatus.InProgress);
        saved.WorkStartedByEmployeeId.Should().Be(fixture.AssigneeId);
        (await fixture.Db.NotificationOutboxes.SingleAsync())
            .EventType.Should().Be("TicketStarted");
    }

    [Fact]
    public async Task RequestInfoAndResume_ShouldPersistBothTransitionsAndOutboxes()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var ticket = await fixture.AddTicketAsync(TicketStatus.InProgress, true);
        var permissions = new TestPermissionService("ticket:update-status");
        var requestInfo = new RequestTicketInfoHandler(
            fixture.Db, Worker(fixture), permissions, new TestAuditLogService());

        var waiting = await requestInfo.Handle(
            new RequestTicketInfoCommand(ticket.Id, "Please provide the vehicle number", ticket.UpdatedAt),
            default);
        waiting.Status.Should().Be(TicketStatus.WaitingInfo);

        var resume = new ResumeTicketWorkHandler(
            fixture.Db, Worker(fixture), permissions, new TestAuditLogService());
        var resumed = await resume.Handle(
            new ResumeTicketWorkCommand(ticket.Id, waiting.UpdatedAt), default);

        resumed.Status.Should().Be(TicketStatus.InProgress);
        (await fixture.Db.TicketComments.CountAsync()).Should().Be(1);
        (await fixture.Db.NotificationOutboxes
            .Select(x => x.EventType).ToListAsync())
            .Should().BeEquivalentTo("TicketWaitingInfo", "TicketStarted");
    }

    [Fact]
    public async Task ResolveWithoutEvidence_ShouldFailAndLeaveTicketInProgress()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var ticket = await fixture.AddTicketAsync(TicketStatus.InProgress, true);
        ticket.ProblemType = TicketProblemType.SystemDefect;
        ticket.ResolutionNote = "Reattached the camera";
        await fixture.Db.SaveChangesAsync();
        var handler = new ResolveTicketHandler(
            fixture.Db,
            Worker(fixture),
            new TestPermissionService("ticket:resolve"),
            new TestAuditLogService());

        var act = () => handler.Handle(
            new ResolveTicketCommand(ticket.Id, ticket.UpdatedAt), default);

        await act.Should().ThrowAsync<FluentValidation.ValidationException>()
            .WithMessage("*หลักฐาน*");
        (await fixture.Db.Tickets.SingleAsync(x => x.Id == ticket.Id))
            .Status.Should().Be(TicketStatus.InProgress);
        (await fixture.Db.NotificationOutboxes.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task ResolveWithCloseoutEvidence_ShouldProceed()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var ticket = await fixture.AddTicketAsync(TicketStatus.InProgress, true);
        ticket.ProblemType = TicketProblemType.SystemDefect;
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
            fixture.Db,
            Worker(fixture),
            new TestPermissionService("ticket:resolve"),
            new TestAuditLogService());

        var result = await handler.Handle(new ResolveTicketCommand(ticket.Id, ticket.UpdatedAt), default);

        result.Status.Should().Be(TicketStatus.Resolved);
    }

    [Fact]
    public async Task AddActivityAttachment_ShouldLinkFileToProgressEntry()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var ticket = await fixture.AddTicketAsync(TicketStatus.InProgress, true);
        var user = Worker(fixture);
        var permissions = new TestPermissionService(
            "ticket:update-status",
            "ticket:add-attachment",
            "ticket:view-assigned");
        var progressHandler = new UpdateTicketProgressHandler(
            fixture.Db,
            user,
            permissions,
            new TestAuditLogService());
        var attachmentHandler = new AddTicketAttachmentHandler(
            fixture.Db,
            user,
            permissions,
            new TestAuditLogService());

        var progress = await progressHandler.Handle(
            new UpdateTicketProgressCommand(
                ticket.Id,
                "ตรวจสอบหน้างาน",
                null,
                null,
                false,
                "ถ่ายรูปประกอบ",
                ticket.UpdatedAt),
            default);
        var upload = new TicketPendingUpload
        {
            UploadedByEmployeeId = fixture.AssigneeId,
            StorageKey = "2026/08/activity.jpg",
            FileName = "activity.jpg",
            ContentType = "image/jpeg",
            SizeBytes = 1024,
            CreatedBy = fixture.AssigneeId,
            UpdatedBy = fixture.AssigneeId
        };
        fixture.Db.TicketPendingUploads.Add(upload);
        await fixture.Db.SaveChangesAsync();

        var attachment = await attachmentHandler.Handle(
            new AddTicketAttachmentCommand(
                ticket.Id,
                $"ticket-upload:{upload.Id}",
                upload.FileName,
                upload.ContentType,
                upload.SizeBytes,
                TicketAttachmentStage.Progress,
                TicketAttachmentVisibility.Public,
                progress.ProgressEntryId),
            default);

        attachment.TicketProgressEntryId.Should().Be(progress.ProgressEntryId);
        var saved = await fixture.Db.TicketAttachments.SingleAsync(a => a.Id == attachment.Id);
        saved.TicketProgressEntryId.Should().Be(progress.ProgressEntryId);
        (await fixture.Db.TicketPendingUploads.SingleAsync(u => u.Id == upload.Id))
            .TicketAttachmentId.Should().Be(attachment.Id);
    }

    [Fact]
    public async Task AddActivityAttachment_ShouldAllowManagerWhoCanCreateProgressEntry()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var ticket = await fixture.AddTicketAsync(TicketStatus.InProgress, true);
        var user = new TestCurrentUser(
            fixture.SupervisorId,
            fixture.CompanyId,
            fixture.TargetDepartmentId,
            RoleType.Supervisor);
        var permissions = new TestPermissionService(
            "ticket:update-status",
            "ticket:add-attachment",
            "ticket:view-team");
        var progressHandler = new UpdateTicketProgressHandler(
            fixture.Db,
            user,
            permissions,
            new TestAuditLogService());
        var attachmentHandler = new AddTicketAttachmentHandler(
            fixture.Db,
            user,
            permissions,
            new TestAuditLogService());

        var progress = await progressHandler.Handle(
            new UpdateTicketProgressCommand(
                ticket.Id,
                null,
                "รอข้อมูลเพิ่มเติม",
                null,
                false,
                "แนบรูปประกอบการติดตาม",
                ticket.UpdatedAt),
            default);
        var upload = new TicketPendingUpload
        {
            UploadedByEmployeeId = fixture.SupervisorId,
            StorageKey = "2026/08/manager-activity.jpg",
            FileName = "manager-activity.jpg",
            ContentType = "image/jpeg",
            SizeBytes = 1024,
            CreatedBy = fixture.SupervisorId,
            UpdatedBy = fixture.SupervisorId
        };
        fixture.Db.TicketPendingUploads.Add(upload);
        await fixture.Db.SaveChangesAsync();

        var attachment = await attachmentHandler.Handle(
            new AddTicketAttachmentCommand(
                ticket.Id,
                $"ticket-upload:{upload.Id}",
                upload.FileName,
                upload.ContentType,
                upload.SizeBytes,
                TicketAttachmentStage.Progress,
                TicketAttachmentVisibility.Public,
                progress.ProgressEntryId),
            default);

        attachment.TicketProgressEntryId.Should().Be(progress.ProgressEntryId);
    }

    [Fact]
    public async Task SupervisorApproval_ShouldWaitForRequesterCompletionConfirmation()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var ticket = await fixture.AddTicketAsync(TicketStatus.Resolved, true);
        ticket.ProblemType = TicketProblemType.SystemDefect;
        ticket.ResolutionNote = "Reattached the camera";
        ticket.ResolvedByEmployeeId = fixture.AssigneeId;
        ticket.ResolvedAt = DateTime.UtcNow.AddHours(7);
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
        var handler = new CloseTicketHandler(
            fixture.Db,
            new TestCurrentUser(
                fixture.SupervisorId,
                fixture.CompanyId,
                fixture.TargetDepartmentId,
                RoleType.Supervisor),
            new TestPermissionService("ticket:close"),
            new TestAuditLogService());

        var result = await handler.Handle(
            new CloseTicketCommand(ticket.Id, "Verified", ticket.UpdatedAt), default);

        result.Status.Should().Be(TicketStatus.AwaitingRequesterConfirmation);
        var assignment = await fixture.Db.TicketAssignments.SingleAsync();
        assignment.IsActive.Should().BeTrue();
        assignment.EndedAt.Should().BeNull();
        (await fixture.Db.TicketReviews.CountAsync()).Should().Be(1);
        (await fixture.Db.NotificationOutboxes.CountAsync()).Should().Be(2);
    }

    [Fact]
    public async Task RequesterConfirmation_ShouldCloseTicketWaitingForRequester()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var ticket = await fixture.AddTicketAsync(TicketStatus.AwaitingRequesterConfirmation, true);
        ticket.VerifiedAt = DateTime.UtcNow.AddHours(7);
        await fixture.Db.SaveChangesAsync();

        var handler = new ConfirmTicketCompletionHandler(
            fixture.Db,
            new TestCurrentUser(
                fixture.RequesterId,
                fixture.CompanyId,
                fixture.SourceDepartmentId,
                RoleType.Employee),
            new TestPermissionService("ticket:view-own"),
            new TestAuditLogService());

        var result = await handler.Handle(
            new ConfirmTicketCompletionCommand(ticket.Id, ticket.UpdatedAt), default);

        result.Status.Should().Be(TicketStatus.Closed);
        var assignment = await fixture.Db.TicketAssignments.SingleAsync();
        assignment.IsActive.Should().BeFalse();
        assignment.EndedAt.Should().NotBeNull();
        (await fixture.Db.NotificationOutboxes.CountAsync()).Should().Be(2);
    }

    private static TestCurrentUser Worker(TicketTestFixture fixture)
        => new(
            fixture.AssigneeId,
            fixture.CompanyId,
            fixture.TargetDepartmentId,
            RoleType.Employee);
}
