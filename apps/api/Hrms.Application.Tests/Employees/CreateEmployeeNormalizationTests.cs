using FluentAssertions;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Employees.CreateEmployee;
using Hrms.Application.Tests.Support;
using Hrms.Domain.Entities;
using Hrms.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace Hrms.Application.Tests.Employees;

/// <summary>
/// admin กรอกรหัสพนักงานเองได้ จึงต้อง normalize ก่อนบันทึก
/// ไม่งั้น canonical form ที่ scripts/pad-employee-code-to-5.sql จัดไว้จะเพี้ยนกลับ
/// </summary>
public class CreateEmployeeNormalizationTests
{
    [Theory]
    [InlineData("123", "00123")]
    [InlineData("  7644 ", "07644")]
    [InlineData("07644", "07644")]
    [InlineData("SYSADMIN2", "SYSADMIN2")]
    public async Task Create_ShouldStoreCanonicalEmployeeCode(string typed, string expected)
    {
        await using var db = CreateDb();
        var companyId = await SeedCompanyAsync(db);

        await Handler(db, companyId).Handle(Command(companyId, typed), default);

        (await db.Employees.SingleAsync()).EmployeeCode.Should().Be(expected);
    }

    [Fact]
    public async Task Create_ShouldRejectDuplicateAgainstCanonicalStoredCode()
    {
        await using var db = CreateDb();
        var companyId = await SeedCompanyAsync(db);
        db.Employees.Add(new Employee
        {
            CompanyId = companyId,
            EmployeeCode = "00123",
            FirstName = "Existing",
            LastName = "Employee",
            IsActive = true
        });
        await db.SaveChangesAsync();

        var action = () => Handler(db, companyId).Handle(Command(companyId, "123"), default);

        var exception = await action.Should().ThrowAsync<ConflictException>();
        exception.Which.Code.Should().Be("DUPLICATE_EMPLOYEE_CODE");
        (await db.Employees.CountAsync()).Should().Be(1);
    }

    private static CreateEmployeeCommand Command(Guid companyId, string employeeCode) => new(
        EmployeeCode: employeeCode,
        FirstName: "New",
        LastName: "Employee",
        Email: null,
        Phone: null,
        NationalId: null,
        Password: "secret123",
        HireDate: null,
        DepartmentId: null,
        CompanyId: companyId);

    private static CreateEmployeeHandler Handler(HrmsDbContext db, Guid companyId)
    {
        var scope = new Mock<IScopeGuard>();
        scope.Setup(x => x.ThrowIfCannotAccessAsync(companyId, It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        var password = new Mock<IPasswordService>();
        password.Setup(x => x.Hash(It.IsAny<string>())).Returns("hashed");
        return new CreateEmployeeHandler(
            db,
            new TestCurrentUser(Guid.NewGuid(), companyId, null),
            scope.Object,
            password.Object,
            new TestPermissionService("employee:create"),
            new TestAuditLogService());
    }

    private static async Task<Guid> SeedCompanyAsync(HrmsDbContext db)
    {
        var companyId = Guid.NewGuid();
        db.Companies.Add(new Company { Id = companyId, Name = "TBG", IsActive = true });
        await db.SaveChangesAsync();
        return companyId;
    }

    private static HrmsDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<HrmsDbContext>()
            .UseInMemoryDatabase($"create-employee-normalization-{Guid.NewGuid():N}")
            .Options;
        return new HrmsDbContext(options);
    }
}
