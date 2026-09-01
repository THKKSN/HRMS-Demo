using Hrms.Application.Common.Exceptions;
using Hrms.Application.Features.Memos.Commands;
using Hrms.Application.Features.Memos.Queries;
using Hrms.Application.Tests.Support;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using Hrms.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Hrms.Application.Tests.Memos;

// ยืนยันว่า permission check ใหม่ (memo:create, memo:view-own, memo:approve) บล็อกจริงเมื่อไม่มีสิทธิ์
public class MemoPermissionTests
{
    [Fact]
    public async Task CreateMemo_WithoutPermission_ThrowsForbidden()
    {
        await using var db = CreateContext();
        var (memoType, category, subCategory) = await SeedTaxonomy(db);
        var requester = await SeedEmployee(db);

        var user = new TestCurrentUser(requester.Id, requester.CompanyId, requester.DepartmentId, RoleType.Employee);
        var handler = new CreateMemoHandler(db, user, new TestPermissionService(), new TestAuditLogService(), new TestMemoNumberGenerator());

        await Assert.ThrowsAsync<AppForbiddenException>(() =>
            handler.Handle(new CreateMemoCommand(memoType.Id, category.Id, subCategory.Id, "รายละเอียด"), CancellationToken.None));
    }

    [Fact]
    public async Task CreateMemo_WithPermission_Succeeds()
    {
        await using var db = CreateContext();
        var (memoType, category, subCategory) = await SeedTaxonomy(db);
        var requester = await SeedEmployee(db);

        var user = new TestCurrentUser(requester.Id, requester.CompanyId, requester.DepartmentId, RoleType.Employee);
        var handler = new CreateMemoHandler(db, user, new TestPermissionService("memo:create"), new TestAuditLogService(), new TestMemoNumberGenerator());

        var result = await handler.Handle(new CreateMemoCommand(memoType.Id, category.Id, subCategory.Id, "รายละเอียด"), CancellationToken.None);

        Assert.Equal(MemoStatus.Pending, result.Status);
    }

    [Fact]
    public async Task ApproveMemo_WithoutPermission_ThrowsForbidden()
    {
        await using var db = CreateContext();
        var (memoType, category, subCategory) = await SeedTaxonomy(db);
        var requester = await SeedEmployee(db);
        var memo = await SeedMemo(db, memoType, category, subCategory, requester);

        var approver = await SeedEmployee(db);
        var user = new TestCurrentUser(approver.Id, approver.CompanyId, approver.DepartmentId, RoleType.Employee);
        var handler = new ApproveMemoHandler(db, user, new TestPermissionService(), new TestAuditLogService());

        await Assert.ThrowsAsync<AppForbiddenException>(() =>
            handler.Handle(new ApproveMemoCommand(memo.Id, null), CancellationToken.None));
    }

    [Fact]
    public async Task ApproveMemo_WithPermission_Succeeds()
    {
        await using var db = CreateContext();
        var (memoType, category, subCategory) = await SeedTaxonomy(db);
        var requester = await SeedEmployee(db);
        var memo = await SeedMemo(db, memoType, category, subCategory, requester);

        var approver = await SeedEmployee(db);
        var user = new TestCurrentUser(approver.Id, approver.CompanyId, approver.DepartmentId, RoleType.Executive);
        var handler = new ApproveMemoHandler(db, user, new TestPermissionService("memo:approve"), new TestAuditLogService());

        var result = await handler.Handle(new ApproveMemoCommand(memo.Id, null), CancellationToken.None);

        Assert.Equal(MemoStatus.Approved, result.Status);
    }

    [Fact]
    public async Task RejectMemo_WithoutPermission_ThrowsForbidden()
    {
        await using var db = CreateContext();
        var (memoType, category, subCategory) = await SeedTaxonomy(db);
        var requester = await SeedEmployee(db);
        var memo = await SeedMemo(db, memoType, category, subCategory, requester);

        var approver = await SeedEmployee(db);
        var user = new TestCurrentUser(approver.Id, approver.CompanyId, approver.DepartmentId, RoleType.Employee);
        var handler = new RejectMemoHandler(db, user, new TestPermissionService(), new TestAuditLogService());

        await Assert.ThrowsAsync<AppForbiddenException>(() =>
            handler.Handle(new RejectMemoCommand(memo.Id, "ไม่อนุมัติ"), CancellationToken.None));
    }

    [Fact]
    public async Task GetMyMemos_WithoutPermission_ThrowsForbidden()
    {
        await using var db = CreateContext();
        var requester = await SeedEmployee(db);

        var user = new TestCurrentUser(requester.Id, requester.CompanyId, requester.DepartmentId, RoleType.Employee);
        var handler = new GetMyMemosHandler(db, user, new TestPermissionService());

        await Assert.ThrowsAsync<AppForbiddenException>(() =>
            handler.Handle(new GetMyMemosQuery(null), CancellationToken.None));
    }

    [Fact]
    public async Task GetMyMemos_WithPermission_Succeeds()
    {
        await using var db = CreateContext();
        var requester = await SeedEmployee(db);

        var user = new TestCurrentUser(requester.Id, requester.CompanyId, requester.DepartmentId, RoleType.Employee);
        var handler = new GetMyMemosHandler(db, user, new TestPermissionService("memo:view-own"));

        var result = await handler.Handle(new GetMyMemosQuery(null), CancellationToken.None);

        Assert.Empty(result);
    }

    private static async Task<(MemoType MemoType, MemoCategory Category, MemoSubCategory SubCategory)> SeedTaxonomy(HrmsDbContext db)
    {
        var company = new Company { Name = $"บริษัท-{Guid.NewGuid():N}", IsActive = true };
        db.Companies.Add(company);
        var department = new Department { CompanyId = company.Id, Name = "แผนก", IsActive = true };
        db.Departments.Add(department);
        var memoType = new MemoType { Name = $"ประเภท-{Guid.NewGuid():N}", CompanyId = company.Id, DepartmentId = department.Id, IsActive = true };
        db.MemoTypes.Add(memoType);
        var category = new MemoCategory { MemoTypeId = memoType.Id, Name = "หมวดหมู่", IsActive = true };
        db.MemoCategories.Add(category);
        var subCategory = new MemoSubCategory { MemoCategoryId = category.Id, Name = "หัวข้อย่อย", IsActive = true };
        db.MemoSubCategories.Add(subCategory);
        await db.SaveChangesAsync();
        return (memoType, category, subCategory);
    }

    private static async Task<Employee> SeedEmployee(HrmsDbContext db)
    {
        var company = new Company { Name = $"บริษัท-{Guid.NewGuid():N}", IsActive = true };
        db.Companies.Add(company);
        var department = new Department { CompanyId = company.Id, Name = "แผนก", IsActive = true };
        db.Departments.Add(department);
        var employee = new Employee
        {
            CompanyId = company.Id,
            DepartmentId = department.Id,
            EmployeeCode = $"EMP-{Guid.NewGuid():N}"[..12],
            FirstName = "ทดสอบ",
            LastName = "ระบบ",
            IsActive = true,
        };
        db.Employees.Add(employee);
        await db.SaveChangesAsync();
        return employee;
    }

    private static async Task<Memo> SeedMemo(
        HrmsDbContext db, MemoType memoType, MemoCategory category, MemoSubCategory subCategory, Employee requester)
    {
        var memo = new Memo
        {
            MemoNo = $"Memo-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid():N}"[..20],
            MemoTypeId = memoType.Id,
            MemoCategoryId = category.Id,
            MemoSubCategoryId = subCategory.Id,
            Detail = "รายละเอียด",
            RequesterId = requester.Id,
            CompanyId = requester.CompanyId,
            DepartmentId = requester.DepartmentId!.Value,
            MemoCategoryNameSnapshot = category.Name,
            MemoSubCategoryNameSnapshot = subCategory.Name,
            Status = MemoStatus.Pending,
        };
        db.Memos.Add(memo);
        await db.SaveChangesAsync();
        return memo;
    }

    private static HrmsDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<HrmsDbContext>()
            .UseInMemoryDatabase($"memo-permission-{Guid.NewGuid():N}")
            .Options;
        return new HrmsDbContext(options);
    }
}
