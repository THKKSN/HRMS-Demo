using FluentAssertions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Tickets.Commands;
using Hrms.Application.Tests.Support;
using Hrms.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace Hrms.Application.Tests.Tickets;

public class CreateTicketIntegrationTests
{
    [Fact]
    public async Task Create_ShouldPersistTicketAndOutboxTogether()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var routing = new TicketRoutingResult(
            TicketRoutingLevel.None,
            TicketRoutingMode.SupervisorAssign,
            TicketRoutingOutcome.NoMatch,
            []);
        var handler = Handler(fixture, routing);

        var result = await handler.Handle(Command(fixture), default);

        result.Status.Should().Be(TicketStatus.Open);
        (await fixture.Db.Tickets.CountAsync()).Should().Be(1);
        var delivery = await fixture.Db.NotificationOutboxes.SingleAsync();
        delivery.EventType.Should().Be("TicketCreated");
        delivery.EntityId.Should().Be(result.Id);
        delivery.Status.Should().Be(NotificationDeliveryStatus.Pending);
    }

    [Fact]
    public async Task Create_ShouldAutoAssignWhenRoutingReturnsSingleCandidate()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var routing = new TicketRoutingResult(
            TicketRoutingLevel.Topic,
            TicketRoutingMode.AutoAssignSingle,
            TicketRoutingOutcome.AutoAssigned,
            [
                new TicketRoutingCandidate(
                    Guid.NewGuid(), fixture.AssigneeId, "Assignee Test", "line-assignee")
            ]);
        var handler = Handler(fixture, routing);

        var result = await handler.Handle(Command(fixture), default);

        result.Status.Should().Be(TicketStatus.Assigned);
        var assignment = await fixture.Db.TicketAssignments.SingleAsync();
        assignment.AssignedToEmployeeId.Should().Be(fixture.AssigneeId);
        assignment.AssignmentSource.Should().Be(TicketAssignmentSource.AutoTopic);
        (await fixture.Db.NotificationOutboxes.CountAsync()).Should().Be(3);
    }

    [Fact]
    public async Task Create_ShouldKeepTicketOpenForMultipleCandidates()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var routing = new TicketRoutingResult(
            TicketRoutingLevel.Topic,
            TicketRoutingMode.AutoAssignSingle,
            TicketRoutingOutcome.SupervisorQueue,
            [
                new TicketRoutingCandidate(
                    Guid.NewGuid(), fixture.AssigneeId, "Assignee Test", "line-assignee"),
                new TicketRoutingCandidate(
                    Guid.NewGuid(), fixture.SupervisorId, "Supervisor Test", "line-supervisor")
            ]);
        var handler = Handler(fixture, routing);

        var result = await handler.Handle(Command(fixture), default);

        result.Status.Should().Be(TicketStatus.Open);
        (await fixture.Db.TicketAssignments.CountAsync()).Should().Be(0);
        (await fixture.Db.NotificationOutboxes.CountAsync()).Should().Be(2);
    }

    private static CreateTicketHandler Handler(
        TicketTestFixture fixture,
        TicketRoutingResult routing)
    {
        var routingService = new Mock<ITicketRoutingService>();
        routingService.Setup(service => service.ResolveAsync(
                fixture.CompanyId,
                fixture.TargetDepartmentId,
                fixture.CategoryId,
                fixture.TopicId,
                It.IsAny<DateOnly>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(routing);
        var number = new Mock<ITicketNumberGenerator>();
        number.Setup(generator => generator.NextAsync(
                It.IsAny<DateOnly>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync("TK-20260727-0001");
        return new CreateTicketHandler(
            fixture.Db,
            new TestCurrentUser(
                fixture.RequesterId,
                fixture.CompanyId,
                fixture.SourceDepartmentId,
                RoleType.Employee),
            new TestPermissionService("ticket:create"),
            new TestAuditLogService(),
            routingService.Object,
            number.Object);
    }

    private static CreateTicketCommand Command(TicketTestFixture fixture)
        => new(
            TicketRequestType.Internal,
            fixture.CompanyId,
            fixture.TargetDepartmentId,
            fixture.CategoryId,
            fixture.TopicId,
            null,
            "Camera adhesive",
            "Camera adhesive is loose",
            TicketPriority.Medium,
            "BUS-01",
            "Garage",
            null,
            null,
            []);
}
