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
    private const string SourceNationalId = "1103703466623";

    /// <summary>รหัสจาก Piswin มาแบบไม่ pad — ต้องถูกแปลงเป็น canonical form ก่อนใช้ทุกครั้ง</summary>
    private const string SourceEmployeeCode = "9905";
    private const string CanonicalEmployeeCode = "09905";

    [Fact]
    public async Task Preview_ShouldMaskNationalIdAndReportExistingEmployee()
    {
        await using var db = CreateDb();
        var companyId = Guid.NewGuid();
        db.Companies.Add(new Company { Id = companyId, Name = "TBG", IsActive = true });
        db.Employees.Add(new Employee
        {
            CompanyId = companyId,
            EmployeeCode = CanonicalEmployeeCode,
            FirstName = "Existing",
            LastName = "Employee",
            NationalId = SourceNationalId
        });
        await db.SaveChangesAsync();

        var result = await PreviewHandler(db, companyId).Handle(
            new PreviewEmployeeImportCommand(SourceNationalId), default);

        result.EmployeeCode.Should().Be(CanonicalEmployeeCode);
        result.FirstName.Should().Be("ฐากร");
        result.NationalIdMasked.Should().Be("1********6623");
        result.NationalIdMasked.Should().NotContain("103703466623");
        result.AlreadyImported.Should().BeTrue();
    }

    [Fact]
    public async Task Preview_ShouldNotReportAlreadyImportedForUnrelatedEmployeeCode()
    {
        await using var db = CreateDb();
        var companyId = Guid.NewGuid();
        db.Companies.Add(new Company { Id = companyId, Name = "TBG", IsActive = true });
        db.Employees.Add(new Employee
        {
            CompanyId = companyId,
            EmployeeCode = "07644",
            FirstName = "Someone",
            LastName = "Else",
            NationalId = SourceNationalId
        });
        await db.SaveChangesAsync();

        var result = await PreviewHandler(db, companyId).Handle(
            new PreviewEmployeeImportCommand(SourceNationalId), default);

        // เลิกเช็ก national_id แล้ว — ตัดสินจากรหัสพนักงานเท่านั้น
        result.AlreadyImported.Should().BeFalse();
    }

    [Fact]
    public async Task Import_ShouldStoreCanonicalEmployeeCodeFromUnpaddedSource()
    {
        await using var db = CreateDb();
        var companyId = await SeedCompanyAndRoleAsync(db);

        var result = await ImportHandler(db, companyId).Handle(
            new ImportEmployeeCommand(SourceNationalId, companyId), default);

        result.EmployeeCode.Should().Be(CanonicalEmployeeCode);
        (await db.Employees.SingleAsync()).EmployeeCode.Should().Be(CanonicalEmployeeCode);
    }

    [Fact]
    public async Task Import_ShouldCreateEmployeeWithoutPasswordOrDepartmentAndAssignEmployeeRole()
    {
        await using var db = CreateDb();
        var companyId = await SeedCompanyAndRoleAsync(db);

        var result = await ImportHandler(db, companyId).Handle(
            new ImportEmployeeCommand(SourceNationalId, companyId), default);

        result.EmployeeCode.Should().Be(CanonicalEmployeeCode);
        var employee = await db.Employees.Include(x => x.Roles).SingleAsync();
        employee.DepartmentId.Should().BeNull();
        employee.PasswordHash.Should().BeNull();
        employee.NationalId.Should().Be(SourceNationalId);
        employee.Roles.Should().ContainSingle(role =>
            role.RoleId == SystemRoleIds.Employee &&
            role.CompanyId == companyId &&
            role.IsActive);
    }

    [Fact]
    public async Task Import_ShouldDetectDuplicateAgainstCanonicalStoredCode()
    {
        // national_id ตั้งใจให้ต่างกัน ดังนั้น duplicate จับได้จากรหัสพนักงานที่ normalize แล้วเท่านั้น
        await using var db = CreateDb();
        var companyId = await SeedCompanyAndRoleAsync(db);
        db.Employees.Add(new Employee
        {
            CompanyId = companyId,
            EmployeeCode = CanonicalEmployeeCode,
            FirstName = "Existing",
            LastName = "Employee",
            NationalId = "9999999999999"
        });
        await db.SaveChangesAsync();

        Func<Task> action = async () => await ImportHandler(db, companyId).Handle(
            new ImportEmployeeCommand(SourceNationalId, companyId), default);

        await action.Should().ThrowAsync<ConflictException>()
            .Where(exception => exception.Code == "DUPLICATE_EMPLOYEE");
        (await db.Employees.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task Import_ShouldAllowSameNationalIdUnderDifferentEmployeeCode()
    {
        // บันทึกการตัดสินใจ: duplicate check ใช้รหัสพนักงานเท่านั้น ไม่เช็ก national_id
        // ถ้าวันหนึ่งต้องกันคนซ้ำด้วยเลขบัตร ต้องเพิ่ม unique index ที่ national_id ด้วย
        await using var db = CreateDb();
        var companyId = await SeedCompanyAndRoleAsync(db);
        db.Employees.Add(new Employee
        {
            CompanyId = companyId,
            EmployeeCode = "07644",
            FirstName = "Existing",
            LastName = "Employee",
            NationalId = SourceNationalId
        });
        await db.SaveChangesAsync();

        var result = await ImportHandler(db, companyId).Handle(
            new ImportEmployeeCommand(SourceNationalId, companyId), default);

        result.EmployeeCode.Should().Be(CanonicalEmployeeCode);
        (await db.Employees.CountAsync()).Should().Be(2);
    }

    private static PreviewEmployeeImportHandler PreviewHandler(
        HrmsDbContext db,
        Guid companyId)
        => new(
            db,
            new TestCurrentUser(Guid.NewGuid(), companyId, null, RoleType.Admin),
            PiswinSource().Object);

    private static ImportEmployeeHandler ImportHandler(HrmsDbContext db, Guid companyId)
    {
        var scope = new Mock<IScopeGuard>();
        scope.Setup(x => x.ThrowIfCannotAccessAsync(companyId, It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        return new ImportEmployeeHandler(
            db,
            scope.Object,
            new TestCurrentUser(Guid.NewGuid(), companyId, null, RoleType.Admin),
            PiswinSource().Object,
            new TestAuditLogService());
    }

    private static Mock<IPiswinEmployeeClient> PiswinSource()
    {
        var source = new Mock<IPiswinEmployeeClient>();
        source.Setup(x => x.FindByNationalIdAsync(SourceNationalId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PiswinEmployee(
                SourceEmployeeCode,
                "ฐากร",
                "คำสิงห์นอก",
                SourceNationalId,
                new DateOnly(2025, 3, 17),
                true));
        return source;
    }

    private static async Task<Guid> SeedCompanyAndRoleAsync(HrmsDbContext db)
    {
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
        return companyId;
    }

    private static HrmsDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<HrmsDbContext>()
            .UseInMemoryDatabase($"employee-import-tests-{Guid.NewGuid():N}")
            .Options;
        return new HrmsDbContext(options);
    }
}
