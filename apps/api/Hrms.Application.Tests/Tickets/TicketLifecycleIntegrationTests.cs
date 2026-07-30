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
    public async Task Close_ShouldEndCurrentAssignmentAndKeepReviewHistory()
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

        result.Status.Should().Be(TicketStatus.Closed);
        var assignment = await fixture.Db.TicketAssignments.SingleAsync();
        assignment.IsActive.Should().BeFalse();
        assignment.EndedAt.Should().NotBeNull();
        (await fixture.Db.TicketReviews.CountAsync()).Should().Be(1);
        (await fixture.Db.NotificationOutboxes.CountAsync()).Should().Be(2);
    }

    private static TestCurrentUser Worker(TicketTestFixture fixture)
        => new(
            fixture.AssigneeId,
            fixture.CompanyId,
            fixture.TargetDepartmentId,
            RoleType.Employee);
}
