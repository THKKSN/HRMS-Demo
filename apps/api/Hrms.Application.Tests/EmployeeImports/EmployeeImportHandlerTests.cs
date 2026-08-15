using FluentAssertions;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.EmployeeImports.ImportEmployee;
using Hrms.Application.Features.EmployeeImports.PreviewEmployeeImport;
using Hrms.Application.Tests.Support;
using Hrms.Domain.Constants;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using Hrms.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace Hrms.Application.Tests.EmployeeImports;

public class EmployeeImportHandlerTests
{
    [Fact]
    public async Task Preview_ShouldMaskNationalIdAndReportExistingEmployee()
    {
        await using var db = CreateDb();
        var companyId = Guid.NewGuid();
        db.Companies.Add(new Company { Id = companyId, Name = "TBG", IsActive = true });
        db.Employees.Add(new Employee
        {
            CompanyId = companyId,
            EmployeeCode = "9905",
            FirstName = "Existing",
            LastName = "Employee",
            NationalId = "1103703466623"
        });
        await db.SaveChangesAsync();

        var source = new Mock<IPiswinEmployeeClient>();
        source.Setup(x => x.FindByNationalIdAsync("1103703466623", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PiswinEmployee(
                "9905", "ฐากร", "คำสิงห์นอก", "1103703466623", new DateOnly(2025, 3, 17), true));
        var handler = new PreviewEmployeeImportHandler(
            db,
            new TestCurrentUser(Guid.NewGuid(), companyId, null, RoleType.Admin),
            source.Object);

        var result = await handler.Handle(new PreviewEmployeeImportCommand("1103703466623"), default);

        result.EmployeeCode.Should().Be("9905");
        result.FirstName.Should().Be("ฐากร");
        result.NationalIdMasked.Should().Be("1********6623");
        result.NationalIdMasked.Should().NotContain("103703466623");
        result.AlreadyImported.Should().BeTrue();
    }

    [Fact]
    public async Task Import_ShouldCreateEmployeeWithoutPasswordOrDepartmentAndAssignEmployeeRole()
    {
        await using var db = CreateDb();
        var companyId = Guid.NewGuid();
        db.Companies.Add(new Company { Id = companyId, Name = "TBG", IsActive = true });
        db.SystemRoles.Add(new SystemRole
        {
            Id = SystemRoleIds.Employee,
            Code = RoleType.Employee,
            NameTh = "พนักงาน",
            IsActive = true
        });
        await db.SaveChangesAsync();

        var source = new Mock<IPiswinEmployeeClient>();
        source.Setup(x => x.FindByNationalIdAsync("1103703466623", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PiswinEmployee(
                "9905", "ฐากร", "คำสิงห์นอก", "1103703466623", new DateOnly(2025, 3, 17), true));
        var scope = new Mock<IScopeGuard>();
        scope.Setup(x => x.ThrowIfCannotAccessAsync(companyId, It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        var handler = new ImportEmployeeHandler(
            db,
            scope.Object,
            new TestCurrentUser(Guid.NewGuid(), companyId, null, RoleType.Admin),
            source.Object,
            new TestAuditLogService());

        var result = await handler.Handle(new ImportEmployeeCommand("1103703466623", companyId), default);

        result.EmployeeCode.Should().Be("9905");
        var employee = await db.Employees.Include(x => x.Roles).SingleAsync();
        employee.DepartmentId.Should().BeNull();
        employee.PasswordHash.Should().BeNull();
        employee.NationalId.Should().Be("1103703466623");
        employee.Roles.Should().ContainSingle(role =>
            role.RoleId == SystemRoleIds.Employee &&
            role.CompanyId == companyId &&
            role.IsActive);
    }

    [Fact]
    public async Task Import_ShouldRejectDuplicateNationalIdWithoutCreatingEmployee()
    {
        await using var db = CreateDb();
        var companyId = Guid.NewGuid();
        db.Companies.Add(new Company { Id = companyId, Name = "TBG", IsActive = true });
        db.Employees.Add(new Employee
        {
            CompanyId = companyId,
            EmployeeCode = "EXISTING",
            FirstName = "Existing",
            LastName = "Employee",
            NationalId = "1103703466623"
        });
        await db.SaveChangesAsync();

        var source = new Mock<IPiswinEmployeeClient>();
        source.Setup(x => x.FindByNationalIdAsync("1103703466623", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PiswinEmployee(
                "9905", "ฐากร", "คำสิงห์นอก", "1103703466623", null, true));
        var scope = new Mock<IScopeGuard>();
        scope.Setup(x => x.ThrowIfCannotAccessAsync(companyId, It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        var handler = new ImportEmployeeHandler(
            db,
            scope.Object,
            new TestCurrentUser(Guid.NewGuid(), companyId, null, RoleType.Admin),
            source.Object,
            new TestAuditLogService());

        Func<Task> action = async () => await handler.Handle(
            new ImportEmployeeCommand("1103703466623", companyId), default);

        await action.Should().ThrowAsync<ConflictException>()
            .Where(exception => exception.Code == "DUPLICATE_EMPLOYEE");
        (await db.Employees.CountAsync()).Should().Be(1);
    }

    private static HrmsDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<HrmsDbContext>()
            .UseInMemoryDatabase($"employee-import-tests-{Guid.NewGuid():N}")
            .Options;
        return new HrmsDbContext(options);
    }
}
