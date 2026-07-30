using FluentAssertions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Employees.AddEmployeeRole;
using Hrms.Application.Tests.Support;
using Hrms.Domain.Constants;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using Hrms.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace Hrms.Application.Tests.Employees;

public class AddEmployeeRoleIntegrationTests
{
    [Fact]
    public async Task AddRole_ShouldPersistSystemRoleIdAndReturnRoleCode()
    {
        await using var db = CreateDb();
        var (companyId, employeeId) = await SeedAsync(db);
        var handler = CreateHandler(db, companyId, employeeId);

        var result = await handler.Handle(
            new AddEmployeeRoleCommand(employeeId, SystemRoleIds.Supervisor, null),
            default);

        result.RoleId.Should().Be(SystemRoleIds.Supervisor);
        result.Role.Should().Be(RoleType.Supervisor);
        (await db.EmployeeRoles.SingleAsync()).RoleId.Should().Be(SystemRoleIds.Supervisor);
    }

    [Fact]
    public async Task AddRole_ShouldRejectUnknownSystemRoleId()
    {
        await using var db = CreateDb();
        var (companyId, employeeId) = await SeedAsync(db);
        var handler = CreateHandler(db, companyId, employeeId);

        var action = () => handler.Handle(
            new AddEmployeeRoleCommand(employeeId, Guid.NewGuid(), null),
            default);

        await action.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("ไม่พบข้อมูล role");
        (await db.EmployeeRoles.CountAsync()).Should().Be(0);
    }

    private static HrmsDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<HrmsDbContext>()
            .UseInMemoryDatabase($"employee-role-tests-{Guid.NewGuid():N}")
            .Options;
        return new HrmsDbContext(options);
    }

    private static async Task<(Guid CompanyId, Guid EmployeeId)> SeedAsync(HrmsDbContext db)
    {
        var companyId = Guid.NewGuid();
        var employeeId = Guid.NewGuid();
        db.Companies.Add(new Company
        {
            Id = companyId,
            Name = "Test Company",
            IsActive = true
        });
        db.Employees.Add(new Employee
        {
            Id = employeeId,
            CompanyId = companyId,
            EmployeeCode = "EMP-ROLE",
            FirstName = "Role",
            LastName = "Tester",
            IsActive = true
        });
        db.SystemRoles.Add(new SystemRole
        {
            Id = SystemRoleIds.Supervisor,
            Code = RoleType.Supervisor,
            NameTh = "หัวหน้างาน",
            IsSystem = true,
            IsActive = true
        });
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();
        return (companyId, employeeId);
    }

    private static AddEmployeeRoleHandler CreateHandler(
        HrmsDbContext db,
        Guid companyId,
        Guid employeeId)
    {
        var scope = new Mock<IScopeGuard>();
        scope.Setup(x => x.ThrowIfCannotAccessAsync(companyId, It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        return new AddEmployeeRoleHandler(
            db,
            scope.Object,
            new TestCurrentUser(employeeId, companyId, null, RoleType.Admin),
            new TestPermissionService("employee:assign-role"),
            new TestAuditLogService());
    }
}
