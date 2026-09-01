using Hrms.Application.Common.Exceptions;
using Hrms.Application.Features.Memos.Commands;
using Hrms.Application.Tests.Support;
using Hrms.Domain.Entities;
using Hrms.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Hrms.Application.Tests.Memos;

public class UpdateMemoTypeCommandTests
{
    [Fact]
    public async Task Handle_ValidRequest_UpdatesNameAndDestination()
    {
        await using var db = CreateContext();
        var (companyA, deptA) = await SeedCompanyDepartment(db, "บริษัท A", "แผนก A");
        var (companyB, deptB) = await SeedCompanyDepartment(db, "บริษัท B", "แผนก B");

        var memoType = new MemoType { Name = "เดิม", CompanyId = companyA.Id, DepartmentId = deptA.Id, IsActive = true };
        db.MemoTypes.Add(memoType);
        await db.SaveChangesAsync();

        var handler = new UpdateMemoTypeHandler(db, new TestAuditLogService());
        var result = await handler.Handle(new UpdateMemoTypeCommand(memoType.Id, "ใหม่", companyB.Id, deptB.Id), CancellationToken.None);

        Assert.Equal("ใหม่", result.Name);
        Assert.Equal(companyB.Id, result.CompanyId);
        Assert.Equal(deptB.Id, result.DepartmentId);
    }

    [Fact]
    public async Task Handle_DuplicateNameAgainstOtherType_Throws()
    {
        await using var db = CreateContext();
        var (company, dept) = await SeedCompanyDepartment(db, "บริษัท A", "แผนก A");

        var existing = new MemoType { Name = "มีอยู่แล้ว", CompanyId = company.Id, DepartmentId = dept.Id, IsActive = true };
        var target = new MemoType { Name = "เดิม", CompanyId = company.Id, DepartmentId = dept.Id, IsActive = true };
        db.MemoTypes.AddRange(existing, target);
        await db.SaveChangesAsync();

        var handler = new UpdateMemoTypeHandler(db, new TestAuditLogService());
        await Assert.ThrowsAsync<ConflictException>(() =>
            handler.Handle(new UpdateMemoTypeCommand(target.Id, "มีอยู่แล้ว", company.Id, dept.Id), CancellationToken.None));
    }

    [Fact]
    public async Task Handle_SameNameAsSelf_DoesNotThrow()
    {
        await using var db = CreateContext();
        var (company, dept) = await SeedCompanyDepartment(db, "บริษัท A", "แผนก A");

        var memoType = new MemoType { Name = "ชื่อเดิม", CompanyId = company.Id, DepartmentId = dept.Id, IsActive = true };
        db.MemoTypes.Add(memoType);
        await db.SaveChangesAsync();

        var handler = new UpdateMemoTypeHandler(db, new TestAuditLogService());
        var result = await handler.Handle(new UpdateMemoTypeCommand(memoType.Id, "ชื่อเดิม", company.Id, dept.Id), CancellationToken.None);

        Assert.Equal("ชื่อเดิม", result.Name);
    }

    [Fact]
    public async Task Handle_DepartmentNotInCompany_Throws()
    {
        await using var db = CreateContext();
        var (companyA, deptA) = await SeedCompanyDepartment(db, "บริษัท A", "แผนก A");
        var (companyB, deptB) = await SeedCompanyDepartment(db, "บริษัท B", "แผนก B");

        var memoType = new MemoType { Name = "เดิม", CompanyId = companyA.Id, DepartmentId = deptA.Id, IsActive = true };
        db.MemoTypes.Add(memoType);
        await db.SaveChangesAsync();

        var handler = new UpdateMemoTypeHandler(db, new TestAuditLogService());
        await Assert.ThrowsAsync<ConflictException>(() =>
            handler.Handle(new UpdateMemoTypeCommand(memoType.Id, "เดิม", companyA.Id, deptB.Id), CancellationToken.None));
    }

    private static async Task<(Company Company, Department Department)> SeedCompanyDepartment(
        HrmsDbContext db, string companyName, string deptName)
    {
        var company = new Company { Name = companyName, IsActive = true };
        db.Companies.Add(company);
        var department = new Department { CompanyId = company.Id, Name = deptName, IsActive = true };
        db.Departments.Add(department);
        await db.SaveChangesAsync();
        return (company, department);
    }

    private static HrmsDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<HrmsDbContext>()
            .UseInMemoryDatabase($"update-memo-type-{Guid.NewGuid():N}")
            .Options;
        return new HrmsDbContext(options);
    }
}
