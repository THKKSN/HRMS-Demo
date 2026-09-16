using FluentAssertions;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Employees.RemoveEmployeeRole;
using Hrms.Application.Tests.Support;
using Hrms.Domain.Constants;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using Hrms.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace Hrms.Application.Tests.Employees;

// guard "LAST_ADMIN" — Admin เป็นสิทธิ์ระดับทั้งระบบ จึงนับผู้ถือ Admin ข้ามบริษัท ไม่ใช่แค่บริษัทเดียวกัน
public class RemoveEmployeeRoleGuardTests
{
    [Fact]
    public async Task RemoveAdmin_WhenAnotherAdminInSameCompany_SoftDeletesRole()
    {
        await using var db = CreateDb();
        var target = await SeedAdminAsync(db, "ADMIN-1");
        await SeedAdminAsync(db, "ADMIN-2", companyId: target.CompanyId);

        await CreateHandler(db).Handle(new RemoveEmployeeRoleCommand(target.EmployeeId, target.RoleRowId), default);

        var role = await db.EmployeeRoles.SingleAsync(r => r.Id == target.RoleRowId);
        role.IsActive.Should().BeFalse();
        // soft delete เท่านั้น — row ต้องยังอยู่ในตาราง
        (await db.EmployeeRoles.CountAsync()).Should().Be(2);
    }

    [Fact]
    public async Task RemoveAdmin_WhenOtherAdminIsInDifferentCompany_SoftDeletesRole()
    {
        await using var db = CreateDb();
        var target = await SeedAdminAsync(db, "ADMIN-1");
        await SeedAdminAsync(db, "ADMIN-2"); // บริษัทอื่น

        await CreateHandler(db).Handle(new RemoveEmployeeRoleCommand(target.EmployeeId, target.RoleRowId), default);

        (await db.EmployeeRoles.SingleAsync(r => r.Id == target.RoleRowId)).IsActive.Should().BeFalse();
    }

    [Fact]
    public async Task RemoveAdmin_WhenOnlyAdminInSystem_ThrowsLastAdmin()
    {
        await using var db = CreateDb();
        var target = await SeedAdminAsync(db, "ADMIN-1");

        var action = () => CreateHandler(db).Handle(
            new RemoveEmployeeRoleCommand(target.EmployeeId, target.RoleRowId), default);

        (await action.Should().ThrowAsync<ConflictException>()).Which.Code.Should().Be("LAST_ADMIN");
        (await db.EmployeeRoles.SingleAsync(r => r.Id == target.RoleRowId)).IsActive.Should().BeTrue();
    }

    [Fact]
    public async Task RemoveAdmin_WhenOtherAdminEmployeeIsInactive_ThrowsLastAdmin()
    {
        await using var db = CreateDb();
        var target = await SeedAdminAsync(db, "ADMIN-1");
        // ผู้ถือ Admin อีกคนถูกปิดใช้งาน — ถอดคนนี้ออกจะไม่มี Admin ที่ใช้งานได้เหลือเลย
        await SeedAdminAsync(db, "ADMIN-2", employeeActive: false);

        var action = () => CreateHandler(db).Handle(
            new RemoveEmployeeRoleCommand(target.EmployeeId, target.RoleRowId), default);

        (await action.Should().ThrowAsync<ConflictException>()).Which.Code.Should().Be("LAST_ADMIN");
    }

    [Fact]
    public async Task RemoveAdmin_WhenOtherAdminRoleAlreadyRevoked_ThrowsLastAdmin()
    {
        await using var db = CreateDb();
        var target = await SeedAdminAsync(db, "ADMIN-1");
        await SeedAdminAsync(db, "ADMIN-2", roleActive: false);

        var action = () => CreateHandler(db).Handle(
            new RemoveEmployeeRoleCommand(target.EmployeeId, target.RoleRowId), default);

        (await action.Should().ThrowAsync<ConflictException>()).Which.Code.Should().Be("LAST_ADMIN");
    }

    [Fact]
    public async Task RemoveNonAdminRole_IsNotGuarded()
    {
        await using var db = CreateDb();
        // Supervisor คนเดียวในระบบ — guard ใช้กับ Admin เท่านั้น จึงถอดได้
        var target = await SeedAdminAsync(db, "SUP-1", roleId: SystemRoleIds.Supervisor);

        await CreateHandler(db).Handle(new RemoveEmployeeRoleCommand(target.EmployeeId, target.RoleRowId), default);

        (await db.EmployeeRoles.SingleAsync(r => r.Id == target.RoleRowId)).IsActive.Should().BeFalse();
    }

    private static HrmsDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<HrmsDbContext>()
            .UseInMemoryDatabase($"remove-role-guard-{Guid.NewGuid():N}")
            .Options;
        return new HrmsDbContext(options);
    }

    private static async Task<(Guid EmployeeId, Guid CompanyId, Guid RoleRowId)> SeedAdminAsync(
        HrmsDbContext db, string code, Guid? companyId = null, Guid? roleId = null,
        bool employeeActive = true, bool roleActive = true)
    {
        var company = companyId ?? Guid.NewGuid();
        if (!await db.Companies.AnyAsync(x => x.Id == company))
            db.Companies.Add(new Company { Id = company, Name = $"Company-{code}", IsActive = true });

        var employeeId = Guid.NewGuid();
        db.Employees.Add(new Employee
        {
            Id = employeeId,
            CompanyId = company,
            EmployeeCode = code,
            FirstName = code,
            LastName = "Tester",
            IsActive = employeeActive,
        });

        var systemRoleId = roleId ?? SystemRoleIds.Admin;
        if (!await db.SystemRoles.AnyAsync(x => x.Id == systemRoleId))
            db.SystemRoles.Add(new SystemRole
            {
                Id = systemRoleId,
                Code = systemRoleId == SystemRoleIds.Admin ? RoleType.Admin : RoleType.Supervisor,
                NameTh = "บทบาททดสอบ",
                IsSystem = true,
                IsActive = true,
            });

        var roleRowId = Guid.NewGuid();
        db.EmployeeRoles.Add(new EmployeeRole
        {
            Id = roleRowId,
            EmployeeId = employeeId,
            RoleId = systemRoleId,
            CompanyId = company,
            IsActive = roleActive,
        });

        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();
        return (employeeId, company, roleRowId);
    }

    private static RemoveEmployeeRoleHandler CreateHandler(HrmsDbContext db)
    {
        var scope = new Mock<IScopeGuard>();
        scope.Setup(x => x.ThrowIfCannotAccessAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        return new RemoveEmployeeRoleHandler(
            db,
            scope.Object,
            new TestCurrentUser(Guid.NewGuid(), Guid.NewGuid(), null, RoleType.Admin),
            new TestPermissionService("employee:assign-role"),
            new TestAuditLogService());
    }
}
