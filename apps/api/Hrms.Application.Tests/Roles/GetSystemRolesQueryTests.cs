using Hrms.Application.Features.Roles.Queries;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using Hrms.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Hrms.Application.Tests.Roles;

public class GetSystemRolesQueryTests
{
    [Fact]
    public async Task Handle_ReturnsOnlyActiveRoles_OrderedByCode()
    {
        await using var db = CreateContext();
        db.SystemRoles.AddRange(
            new SystemRole { Code = RoleType.Executive, NameTh = "ผู้บริหาร", IsActive = true },
            new SystemRole { Code = RoleType.Admin, NameTh = "แอดมิน", IsActive = true },
            new SystemRole { Code = RoleType.Hr, NameTh = "เอชอาร์ (ปิดใช้งาน)", IsActive = false });
        await db.SaveChangesAsync();

        var handler = new GetSystemRolesHandler(db);
        var result = await handler.Handle(new GetSystemRolesQuery(), CancellationToken.None);

        Assert.Equal(2, result.Count);
        Assert.DoesNotContain(result, r => r.NameTh == "เอชอาร์ (ปิดใช้งาน)");
        // OrderBy(role.Code) เรียงตามค่า enum RoleType (int) ไม่ใช่ string — Executive(4) มาก่อน Admin(5)
        Assert.Equal("Executive", result[0].Code);
        Assert.Equal("Admin", result[1].Code);
    }

    [Fact]
    public async Task Handle_NoRolesInDatabase_ReturnsEmptyListWithoutThrowing()
    {
        await using var db = CreateContext();

        var handler = new GetSystemRolesHandler(db);
        var result = await handler.Handle(new GetSystemRolesQuery(), CancellationToken.None);

        Assert.Empty(result);
    }

    [Fact]
    public async Task Handle_AllRolesInactive_ReturnsEmptyList()
    {
        await using var db = CreateContext();
        db.SystemRoles.Add(new SystemRole { Code = RoleType.Admin, NameTh = "แอดมิน (ปิดใช้งาน)", IsActive = false });
        await db.SaveChangesAsync();

        var handler = new GetSystemRolesHandler(db);
        var result = await handler.Handle(new GetSystemRolesQuery(), CancellationToken.None);

        Assert.Empty(result);
    }

    private static HrmsDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<HrmsDbContext>()
            .UseInMemoryDatabase($"system-roles-query-{Guid.NewGuid():N}")
            .Options;
        return new HrmsDbContext(options);
    }
}
