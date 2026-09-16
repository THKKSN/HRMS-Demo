using FluentAssertions;
using Hrms.Application.Features.Tickets.Queries;
using Hrms.Application.Tests.Support;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;

namespace Hrms.Application.Tests.Tickets;

/// <summary>
/// ตัวกรอง "ขอบเขตงาน" ของหน้า Assigned — งานที่ได้รับมอบหมาย / ประวัติงาน / ทั้งหมด
/// ดูที่สถานะแถวมอบหมาย (IsActive) ไม่ใช่สถานะใบแจ้งเรื่อง
/// </summary>
public class AssignedTicketScopeTests
{
    private static GetAssignedTicketsHandler Handler(TicketTestFixture fixture)
        => new(
            fixture.Db,
            new TestCurrentUser(
                fixture.AssigneeId, fixture.CompanyId, fixture.TargetDepartmentId, RoleType.Employee),
            new TestPermissionService("ticket:view-assigned"));

    /// <summary>แถวมอบหมายที่จบไปแล้ว (ถูกเปลี่ยนตัวออก) — ActiveSlot ต้องเป็น null</summary>
    private static async Task AddPastAssignmentAsync(
        TicketTestFixture fixture, Guid ticketId, DateTime assignedAt)
    {
        fixture.Db.TicketAssignments.Add(new TicketAssignment
        {
            TicketId = ticketId,
            AssignedToEmployeeId = fixture.AssigneeId,
            AssignedByEmployeeId = fixture.SupervisorId,
            AssignedAt = assignedAt,
            MemberRole = TicketAssignmentRole.Owner,
            IsPrimary = true,
            IsActive = false,
            ActiveSlot = null,
            AssignmentSource = TicketAssignmentSource.Manual
        });
        await fixture.Db.SaveChangesAsync();
        fixture.Db.ChangeTracker.Clear();
    }

    [Fact]
    public async Task CurrentScope_ShouldReturnOnlyTicketsStillHeld()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var working = await fixture.AddTicketAsync(TicketStatus.InProgress, activeAssignment: true);
        var handedOver = await fixture.AddTicketAsync(TicketStatus.InProgress);
        await AddPastAssignmentAsync(fixture, handedOver.Id, DateTime.UtcNow.AddHours(7).AddDays(-3));

        var result = await Handler(fixture).Handle(
            new GetAssignedTicketsQuery(null, null, Scope: AssignedTicketScope.Current), default);

        result.Items.Should().ContainSingle().Which.Id.Should().Be(working.Id);
    }

    [Fact]
    public async Task HistoryScope_ShouldReturnOnlyTicketsAlreadyHandedOver()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        await fixture.AddTicketAsync(TicketStatus.InProgress, activeAssignment: true);
        var handedOver = await fixture.AddTicketAsync(TicketStatus.InProgress);
        await AddPastAssignmentAsync(fixture, handedOver.Id, DateTime.UtcNow.AddHours(7).AddDays(-3));

        var result = await Handler(fixture).Handle(
            new GetAssignedTicketsQuery(null, null, Scope: AssignedTicketScope.History), default);

        result.Items.Should().ContainSingle().Which.Id.Should().Be(handedOver.Id);
    }

    [Fact]
    public async Task AllScope_ShouldReturnBothSides()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var working = await fixture.AddTicketAsync(TicketStatus.InProgress, activeAssignment: true);
        var handedOver = await fixture.AddTicketAsync(TicketStatus.InProgress);
        await AddPastAssignmentAsync(fixture, handedOver.Id, DateTime.UtcNow.AddHours(7).AddDays(-3));

        var result = await Handler(fixture).Handle(
            new GetAssignedTicketsQuery(null, null, Scope: AssignedTicketScope.All), default);

        result.TotalCount.Should().Be(2);
        result.Items.Select(item => item.Id).Should().BeEquivalentTo([working.Id, handedOver.Id]);
    }

    [Fact]
    public async Task AllScope_ShouldListTicketOnce_WhenSamePersonGotItBack()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        // เคยถือ → ถูกเปลี่ยนตัวออก → ได้กลับมาถืออีกครั้ง = 2 แถวมอบหมายของใบเดียวกัน
        var ticket = await fixture.AddTicketAsync(TicketStatus.InProgress, activeAssignment: true);
        await AddPastAssignmentAsync(fixture, ticket.Id, DateTime.UtcNow.AddHours(7).AddDays(-5));

        var result = await Handler(fixture).Handle(
            new GetAssignedTicketsQuery(null, null, Scope: AssignedTicketScope.All), default);

        result.TotalCount.Should().Be(1);
        // แถวที่เหลือต้องเป็นรอบล่าสุด ไม่ใช่รอบที่จบไปแล้ว
        result.Items.Single().AssignedAt.Should().BeAfter(DateTime.UtcNow.AddHours(7).AddDays(-1));
    }

    [Fact]
    public async Task LegacyHistoryFlag_ShouldStillWork_WhenScopeNotSent()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        await fixture.AddTicketAsync(TicketStatus.InProgress, activeAssignment: true);
        var handedOver = await fixture.AddTicketAsync(TicketStatus.InProgress);
        await AddPastAssignmentAsync(fixture, handedOver.Id, DateTime.UtcNow.AddHours(7).AddDays(-3));

        // liff-web ยังส่ง history=true อยู่ ยังไม่ได้เปลี่ยนไปใช้ scope
        var result = await Handler(fixture).Handle(
            new GetAssignedTicketsQuery(null, null, History: true), default);

        result.Items.Should().ContainSingle().Which.Id.Should().Be(handedOver.Id);
    }
}
