using Hrms.Application.Common.Exceptions;
using Hrms.Application.Features.Memos.Commands;
using Hrms.Application.Tests.Support;
using Hrms.Domain.Entities;
using Hrms.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Hrms.Application.Tests.Memos;

public class UpdateMemoCategoryCommandTests
{
    [Fact]
    public async Task Handle_ValidRequest_UpdatesName()
    {
        await using var db = CreateContext();
        var memoType = await SeedMemoType(db);
        var category = new MemoCategory { MemoTypeId = memoType.Id, Name = "เดิม", IsActive = true };
        db.MemoCategories.Add(category);
        await db.SaveChangesAsync();

        var handler = new UpdateMemoCategoryHandler(db, new TestAuditLogService());
        var result = await handler.Handle(new UpdateMemoCategoryCommand(category.Id, "ใหม่"), CancellationToken.None);

        Assert.Equal("ใหม่", result.Name);
    }

    [Fact]
    public async Task Handle_DuplicateNameWithinSameMemoType_Throws()
    {
        await using var db = CreateContext();
        var memoType = await SeedMemoType(db);
        var existing = new MemoCategory { MemoTypeId = memoType.Id, Name = "มีอยู่แล้ว", IsActive = true };
        var target = new MemoCategory { MemoTypeId = memoType.Id, Name = "เดิม", IsActive = true };
        db.MemoCategories.AddRange(existing, target);
        await db.SaveChangesAsync();

        var handler = new UpdateMemoCategoryHandler(db, new TestAuditLogService());
        await Assert.ThrowsAsync<ConflictException>(() =>
            handler.Handle(new UpdateMemoCategoryCommand(target.Id, "มีอยู่แล้ว"), CancellationToken.None));
    }

    [Fact]
    public async Task Handle_SameNameDifferentMemoType_DoesNotThrow()
    {
        await using var db = CreateContext();
        var memoTypeA = await SeedMemoType(db);
        var memoTypeB = await SeedMemoType(db);
        var categoryInOtherType = new MemoCategory { MemoTypeId = memoTypeA.Id, Name = "ชื่อซ้ำ", IsActive = true };
        var target = new MemoCategory { MemoTypeId = memoTypeB.Id, Name = "เดิม", IsActive = true };
        db.MemoCategories.AddRange(categoryInOtherType, target);
        await db.SaveChangesAsync();

        var handler = new UpdateMemoCategoryHandler(db, new TestAuditLogService());
        var result = await handler.Handle(new UpdateMemoCategoryCommand(target.Id, "ชื่อซ้ำ"), CancellationToken.None);

        Assert.Equal("ชื่อซ้ำ", result.Name);
    }

    private static async Task<MemoType> SeedMemoType(HrmsDbContext db)
    {
        var company = new Company { Name = $"บริษัท-{Guid.NewGuid():N}", IsActive = true };
        db.Companies.Add(company);
        var department = new Department { CompanyId = company.Id, Name = "แผนก", IsActive = true };
        db.Departments.Add(department);
        var memoType = new MemoType { Name = $"ประเภท-{Guid.NewGuid():N}", CompanyId = company.Id, DepartmentId = department.Id, IsActive = true };
        db.MemoTypes.Add(memoType);
        await db.SaveChangesAsync();
        return memoType;
    }

    private static HrmsDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<HrmsDbContext>()
            .UseInMemoryDatabase($"update-memo-category-{Guid.NewGuid():N}")
            .Options;
        return new HrmsDbContext(options);
    }
}
