using FluentAssertions;
using Hrms.Application.Features.ExternalTickets.Commands;
using Hrms.Application.Features.Tickets.Commands;
using Hrms.Application.Tests.Support;
using Hrms.Domain.Enums;

namespace Hrms.Application.Tests.Tickets;

/// <summary>
/// ชื่อหลายภาษา (i18n Phase M) ของ master data ต้องกลับมากับ response ของทั้งตอนสร้างและตอนแก้ไข
///
/// DTO เหล่านี้ประกาศ NameEn/NameId เป็น optional parameter ท้าย record — จุดที่สร้าง DTO
/// แบบ positional แล้วหยุดก่อนถึงสองตัวนี้จะคืน null เงียบ ๆ โดย compiler ไม่เตือน
/// เคยพลาดมาแล้วที่ ToDto ของ handler ตอนสร้าง 4 ตัว เทสต์ชุดนี้กันไม่ให้หลุดอีก
/// </summary>
public class TicketTaxonomyLocalizedNameTests
{
    [Fact]
    public async Task CreateCategory_ShouldReturnLocalizedNames()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var handler = new CreateTicketCategoryHandler(
            fixture.Db, Supervisor(fixture), new TestPermissionService("ticket:manage-categories"), new TestAuditLogService());

        var created = await handler.Handle(
            new CreateTicketCategoryCommand(
                fixture.CompanyId, fixture.TargetDepartmentId, "อุปกรณ์", null, 10, "Hardware", "Perangkat keras"),
            default);

        created.NameEn.Should().Be("Hardware");
        created.NameId.Should().Be("Perangkat keras");
    }

    [Fact]
    public async Task CreateTopic_ShouldReturnLocalizedNames()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var handler = new CreateTicketTopicHandler(
            fixture.Db, Supervisor(fixture), new TestPermissionService("ticket:manage-topics"), new TestAuditLogService());

        var created = await handler.Handle(
            new CreateTicketTopicCommand(
                fixture.CompanyId, fixture.TargetDepartmentId, fixture.CategoryId, "กล้อง", null, 10, false,
                "Camera", "Kamera"),
            default);

        created.NameEn.Should().Be("Camera");
        created.NameId.Should().Be("Kamera");
    }

    [Fact]
    public async Task CreateSubject_ShouldReturnLocalizedNames()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var handler = new CreateTicketSubjectHandler(
            fixture.Db, Supervisor(fixture), new TestPermissionService("ticket:manage-topics"), new TestAuditLogService());

        var created = await handler.Handle(
            new CreateTicketSubjectCommand(
                fixture.CompanyId, fixture.TargetDepartmentId, fixture.CategoryId, fixture.TopicId,
                "กาวกล้องหลุด", null, 10, "Camera adhesive", "Perekat kamera"),
            default);

        created.NameEn.Should().Be("Camera adhesive");
        created.NameId.Should().Be("Perekat kamera");
    }

    [Fact]
    public async Task CreateExternalCategory_ShouldReturnLocalizedNames()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        var handler = new CreateExternalTicketCategoryHandler(
            fixture.Db, Supervisor(fixture), new TestPermissionService("ticket:manage-external-config"), new TestAuditLogService());

        var created = await handler.Handle(
            new CreateExternalTicketCategoryCommand("แจ้งซ่อม", null, 10, "Repair", "Perbaikan"),
            default);

        created.NameEn.Should().Be("Repair");
        created.NameId.Should().Be("Perbaikan");
    }

    private static TestCurrentUser Supervisor(TicketTestFixture fixture)
        => new(
            fixture.SupervisorId,
            fixture.CompanyId,
            fixture.TargetDepartmentId,
            RoleType.Supervisor);
}
