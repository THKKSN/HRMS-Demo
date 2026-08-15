using FluentAssertions;
using Hrms.Application.Features.Tickets;
using Hrms.Application.Features.Tickets.Queries;
using Hrms.Application.Tests.Support;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;

namespace Hrms.Application.Tests.Tickets;

public class TicketRequesterResolverTests
{
    private static readonly Guid ExternalCompanyId =
        Guid.Parse("c89cb0d1-7548-4c1b-a36a-929f094f0b30");

    private readonly TicketRequesterResolver _resolver = new();

    [Fact]
    public void FromEmployee_ShouldReturnInternalRequesterAndLineRecipient()
    {
        var employee = new Employee
        {
            Id = Guid.NewGuid(),
            FirstName = "สมชาย",
            LastName = "พนักงาน",
            Phone = "0812345678",
            Email = "employee@example.com",
            LineUserId = "U-employee",
            Company = new Company { Name = "Internal Company" }
        };

        var result = _resolver.FromEmployee(employee);

        result.RequestType.Should().Be(TicketRequestType.Internal);
        result.EmployeeId.Should().Be(employee.Id);
        result.ExternalReporterId.Should().BeNull();
        result.DisplayName.Should().Be("สมชาย พนักงาน");
        result.LineUserId.Should().Be("U-employee");
        result.Organization.Should().Be("Internal Company");
    }

    [Fact]
    public void FromExternalReporter_ShouldReturnExternalRequesterAndLineRecipient()
    {
        var reporter = new ExternalReporter
        {
            Id = Guid.NewGuid(),
            LineUserId = "U-external",
            LineDisplayName = "LINE Display",
            FullName = "สมหญิง ผู้แจ้ง",
            Phone = "0899999999",
            Email = "external@example.com",
            Organization = "External Organization"
        };

        var result = _resolver.FromExternalReporter(reporter);

        result.RequestType.Should().Be(TicketRequestType.External);
        result.EmployeeId.Should().BeNull();
        result.ExternalReporterId.Should().Be(reporter.Id);
        result.DisplayName.Should().Be("สมหญิง ผู้แจ้ง");
        result.LineUserId.Should().Be("U-external");
        result.Organization.Should().Be("External Organization");
    }

    [Fact]
    public void FromTicket_ShouldUseStableSnapshotsWhenExternalNavigationIsUnavailable()
    {
        var reporterId = Guid.NewGuid();
        var ticket = new Ticket
        {
            RequestType = TicketRequestType.External,
            ExternalReporterId = reporterId,
            RequesterNameSnapshot = "ชื่อ ณ วันที่แจ้ง",
            RequesterPhoneSnapshot = "0800000000",
            RequesterEmailSnapshot = "snapshot@example.com",
            RequesterOrganizationSnapshot = "Snapshot Organization",
            RequesterLineDisplayNameSnapshot = "LINE Snapshot"
        };

        var result = _resolver.FromTicket(ticket);

        result.ExternalReporterId.Should().Be(reporterId);
        result.DisplayName.Should().Be("ชื่อ ณ วันที่แจ้ง");
        result.Phone.Should().Be("0800000000");
        result.LineUserId.Should().BeNull();
    }

    [Fact]
    public async Task QueueNotification_ShouldUseExternalRequesterLineRecipient()
    {
        await using var fixture = new TicketTestFixture();
        var ticket = new Ticket { Id = Guid.NewGuid(), TicketNo = "TK-EXT-001" };
        var requester = new TicketRequesterContext(
            TicketRequestType.External,
            null,
            Guid.NewGuid(),
            "External Reporter",
            "U-external",
            null,
            null,
            null);

        TicketCommandSupport.QueueNotification(
            fixture.Db, "TicketAccepted", Guid.NewGuid(), requester, "accepted", ticket);

        var notification = fixture.Db.NotificationOutboxes.Local.Single();
        notification.RecipientEmployeeId.Should().BeNull();
        notification.LineUserId.Should().Be("U-external");
    }

    [Fact]
    public async Task AssignedList_ShouldMapExternalRequesterWithoutEmployeeNavigation()
    {
        await using var fixture = new TicketTestFixture(ExternalCompanyId);
        await fixture.SeedOrganizationAsync();
        await fixture.AddExternalTicketAsync(TicketStatus.Assigned, activeAssignment: true);
        var handler = new GetAssignedTicketsHandler(
            fixture.Db,
            new TestCurrentUser(
                fixture.AssigneeId, fixture.CompanyId, fixture.TargetDepartmentId, RoleType.Employee),
            new TestPermissionService("ticket:view-assigned"));

        var result = await handler.Handle(new GetAssignedTicketsQuery(null, null), default);

        result.Items.Should().ContainSingle();
        result.Items.Single().RequesterName.Should().Be("External Reporter");
    }

    [Fact]
    public async Task StaffInbox_ShouldMapExternalRequesterWithoutEmployeeNavigation()
    {
        await using var fixture = new TicketTestFixture(ExternalCompanyId);
        await fixture.SeedOrganizationAsync();
        await fixture.AddExternalTicketAsync();
        var handler = new GetTicketInboxHandler(
            fixture.Db,
            new TestCurrentUser(
                fixture.SupervisorId, fixture.CompanyId, fixture.TargetDepartmentId, RoleType.Supervisor),
            new TestPermissionService("ticket:view-team"));

        var result = await handler.Handle(
            new GetTicketInboxQuery(null, null, null, null, null, null, null, null, null), default);

        result.Items.Should().ContainSingle();
        result.Items.Single().RequesterName.Should().Be("External Reporter");
    }

    [Fact]
    public async Task StaffDetail_ShouldExposeExternalRequesterContactAfterViewAuthorization()
    {
        await using var fixture = new TicketTestFixture(ExternalCompanyId);
        await fixture.SeedOrganizationAsync();
        var ticket = await fixture.AddExternalTicketAsync();
        var handler = new GetTicketDetailHandler(
            fixture.Db,
            new TestCurrentUser(
                fixture.SupervisorId, fixture.CompanyId, fixture.TargetDepartmentId, RoleType.Supervisor),
            new TestPermissionService("ticket:view-team"),
            _resolver);

        var result = await handler.Handle(new GetTicketDetailQuery(ticket.Id), default);

        result.Requester.Type.Should().Be(TicketRequestType.External);
        result.Requester.EmployeeId.Should().BeNull();
        result.Requester.ExternalReporterId.Should().NotBeNull();
        result.Requester.Name.Should().Be("External Reporter");
        result.Requester.Phone.Should().Be("0812345678");
        result.Requester.Email.Should().Be("external@example.com");
        result.Requester.Organization.Should().Be("External Organization");
    }

    [Fact]
    public async Task StaffQueries_ShouldExposeExternalActorIdsForPublicActivity()
    {
        await using var fixture = new TicketTestFixture(ExternalCompanyId);
        await fixture.SeedOrganizationAsync();
        var ticket = await fixture.AddExternalTicketAsync(TicketStatus.InProgress);
        var reporterId = ticket.ExternalReporterId!.Value;
        fixture.Db.TicketComments.Add(new TicketComment
        {
            TicketId = ticket.Id,
            ExternalReporterId = reporterId,
            CommentType = TicketCommentType.Response,
            Message = "ข้อมูลจากผู้แจ้งภายนอก"
        });
        fixture.Db.TicketProgressEntries.Add(new TicketProgressEntry
        {
            TicketId = ticket.Id,
            CreatedByExternalReporterId = reporterId,
            WorkflowStepKey = "in-progress",
            Note = "External public activity"
        });
        await fixture.Db.SaveChangesAsync();
        fixture.Db.ChangeTracker.Clear();
        var user = new TestCurrentUser(
            fixture.SupervisorId, fixture.CompanyId, fixture.TargetDepartmentId, RoleType.Supervisor);
        var permissions = new TestPermissionService("ticket:view-team");

        var comments = await new GetTicketCommentsHandler(fixture.Db, user, permissions)
            .Handle(new GetTicketCommentsQuery(ticket.Id), default);
        var detail = await new GetTicketDetailHandler(fixture.Db, user, permissions, _resolver)
            .Handle(new GetTicketDetailQuery(ticket.Id), default);

        comments.Single().EmployeeId.Should().BeNull();
        comments.Single().ExternalReporterId.Should().Be(reporterId);
        detail.ProgressEntries.Single().CreatedByEmployeeId.Should().BeNull();
        detail.ProgressEntries.Single().CreatedByExternalReporterId.Should().Be(reporterId);
    }
}
