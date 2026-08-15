using BC = BCrypt.Net.BCrypt;
using FluentAssertions;
using Hrms.Domain.Constants;
using Hrms.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace Hrms.Application.Tests.Persistence;

public class DataSeederTests
{
    [Fact]
    public async Task SeedAsync_ShouldCreateOnlySystemAdminEmployee()
    {
        await using var db = CreateDb();
        var seeder = new DataSeeder(
            db,
            NullLogger<DataSeeder>.Instance,
            new PermissionSeeder(db));

        await seeder.SeedAsync();

        var employees = await db.Employees
            .Include(e => e.Roles)
            .OrderBy(e => e.EmployeeCode)
            .ToListAsync();

        employees.Should().ContainSingle();
        var admin = employees.Single();
        admin.EmployeeCode.Should().Be("SYSADMIN");
        admin.Email.Should().Be("tbg.line.dev@gmail.com");
        admin.FirstName.Should().Be("System");
        admin.LastName.Should().Be("Admin");
        admin.IsActive.Should().BeTrue();
        BC.Verify("P@55W0rd", admin.PasswordHash).Should().BeTrue();
        admin.Roles.Should().ContainSingle(role =>
            role.RoleId == SystemRoleIds.Admin &&
            role.CompanyId == admin.CompanyId &&
            role.IsActive);
    }

    private static HrmsDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<HrmsDbContext>()
            .UseInMemoryDatabase($"data-seeder-tests-{Guid.NewGuid():N}")
            .Options;

        return new HrmsDbContext(options);
    }
}
