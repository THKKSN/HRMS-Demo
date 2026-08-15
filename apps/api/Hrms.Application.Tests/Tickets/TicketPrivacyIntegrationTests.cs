using FluentAssertions;
using Hrms.Application.Features.Tickets;
using Hrms.Application.Features.Tickets.Queries;
using Hrms.Application.Tests.Support;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;

namespace Hrms.Application.Tests.Tickets;

public class TicketPrivacyIntegrationTests
{
    [Fact]
    public async Task Requester_ShouldNotSeeInternalAttachmentOrRawAuditValues()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var ticket = await fixture.AddTicketAsync(TicketStatus.InProgress, true);
        fixture.Db.TicketAttachments.AddRange(
            Attachment(ticket.Id, TicketAttachmentVisibility.Public, "public.jpg"),
            Attachment(ticket.Id, TicketAttachmentVisibility.Internal, "internal.jpg"));
        fixture.Db.AuditLogs.Add(new AuditLog
        {
            Module = "ticket",
            EntityType = "Ticket",
            EntityId = ticket.Id.ToString(),
            Action = "assign",
            Description = "Assigned",
            OldValues = "{\"secret\":\"before\"}",
            NewValues = "{\"secret\":\"after\"}"
        });
        await fixture.Db.SaveChangesAsync();
        var handler = new GetTicketDetailHandler(
            fixture.Db,
            new TestCurrentUser(
                fixture.RequesterId,
                fixture.CompanyId,
                fixture.SourceDepartmentId,
                RoleType.Employee),
            new TestPermissionService(
                "ticket:view-own", "ticket:comment", "ticket:add-attachment"),
            new TicketRequesterResolver());

        var detail = await handler.Handle(new GetTicketDetailQuery(ticket.Id), default);

        detail.Attachments.Should().ContainSingle()
            .Which.FileName.Should().Be("public.jpg");
        detail.AuditEvents.Should().ContainSingle();
        detail.AuditEvents[0].OldValues.Should().BeNull();
        detail.AuditEvents[0].NewValues.Should().BeNull();
    }

    private static TicketAttachment Attachment(
        Guid ticketId,
        TicketAttachmentVisibility visibility,
        string fileName)
        => new()
        {
            TicketId = ticketId,
            UploadedByEmployeeId = Guid.NewGuid(),
            Url = $"/protected/{fileName}",
            FileName = fileName,
            ContentType = "image/jpeg",
            SizeBytes = 100,
            Stage = TicketAttachmentStage.Progress,
            Visibility = visibility
        };
}
