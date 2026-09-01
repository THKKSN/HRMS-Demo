using Hrms.Application.Common.Exceptions;
using Hrms.Application.Features.Memos.Commands;
using Hrms.Application.Tests.Support;
using Hrms.Domain.Entities;
using Hrms.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Hrms.Application.Tests.Memos;

public class UpdateMemoSubCategoryCommandTests
{
    [Fact]
    public async Task Handle_ValidRequest_UpdatesName()
    {
        await using var db = CreateContext();
        var category = await SeedCategory(db);
        var subCategory = new MemoSubCategory { MemoCategoryId = category.Id, Name = "เดิม", IsActive = true };
        db.MemoSubCategories.Add(subCategory);
        await db.SaveChangesAsync();

        var handler = new UpdateMemoSubCategoryHandler(db, new TestAuditLogService());
        var result = await handler.Handle(new UpdateMemoSubCategoryCommand(subCategory.Id, "ใหม่"), CancellationToken.None);

        Assert.Equal("ใหม่", result.Name);
    }

    [Fact]
    public async Task Handle_DuplicateNameWithinSameCategory_Throws()
    {
        await using var db = CreateContext();
        var category = await SeedCategory(db);
        var existing = new MemoSubCategory { MemoCategoryId = category.Id, Name = "มีอยู่แล้ว", IsActive = true };
        var target = new MemoSubCategory { MemoCategoryId = category.Id, Name = "เดิม", IsActive = true };
        db.MemoSubCategories.AddRange(existing, target);
        await db.SaveChangesAsync();

        var handler = new UpdateMemoSubCategoryHandler(db, new TestAuditLogService());
        await Assert.ThrowsAsync<ConflictException>(() =>
            handler.Handle(new UpdateMemoSubCategoryCommand(target.Id, "มีอยู่แล้ว"), CancellationToken.None));
    }

    private static async Task<MemoCategory> SeedCategory(HrmsDbContext db)
    {
        var company = new Company { Name = $"บริษัท-{Guid.NewGuid():N}", IsActive = true };
        db.Companies.Add(company);
        var department = new Department { CompanyId = company.Id, Name = "แผนก", IsActive = true };
        db.Departments.Add(department);
        var memoType = new MemoType { Name = $"ประเภท-{Guid.NewGuid():N}", CompanyId = company.Id, DepartmentId = department.Id, IsActive = true };
        db.MemoTypes.Add(memoType);
        var category = new MemoCategory { MemoTypeId = memoType.Id, Name = "หมวดหมู่", IsActive = true };
        db.MemoCategories.Add(category);
        await db.SaveChangesAsync();
        return category;
    }

    private static HrmsDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<HrmsDbContext>()
            .UseInMemoryDatabase($"update-memo-subcategory-{Guid.NewGuid():N}")
            .Options;
        return new HrmsDbContext(options);
    }
}
