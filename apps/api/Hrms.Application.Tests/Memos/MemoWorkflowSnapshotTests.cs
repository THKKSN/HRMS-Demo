using Hrms.Application.Features.Memos.Commands;
using Hrms.Application.Features.Memos.Services;
using Hrms.Application.Tests.Memos.Support;
using Hrms.Application.Tests.Support;
using Hrms.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Hrms.Application.Tests.Memos;

// การสร้างเรื่อง snapshot ขั้นตอนและผู้อนุมัติด่านแรกจาก MemoType — แก้ config ภายหลังไม่กระทบเรื่องเดิม
public class MemoWorkflowSnapshotTests
{
    [Fact]
    public async Task CreateMemo_CopiesActiveWorkflowStepsToInstances()
    {
        await using var db = MemoTestData.CreateContext();
        var (company, department) = await MemoTestData.SeedOrgAsync(db);
        var (memoType, category, subCategory) = await MemoTestData.SeedTaxonomyAsync(db, company.Id, department.Id);
        await MemoTestData.SeedWorkflowStepAsync(db, memoType.Id, 1, "จัดทำ PR", MemoStepKind.Work, RoleType.Supervisor);
        await MemoTestData.SeedWorkflowStepAsync(db, memoType.Id, 2, "อนุมัติรอบสอง", MemoStepKind.Approval, RoleType.Executive);
        // step ที่ปิดใช้งานไม่ถูก copy
        await MemoTestData.SeedWorkflowStepAsync(db, memoType.Id, 3, "ยกเลิกแล้ว", MemoStepKind.Work, RoleType.Hr, isActive: false);

        var requester = await MemoTestData.SeedEmployeeAsync(db, company.Id, department.Id);
        var result = await CreateMemoAsync(db, requester, memoType.Id, category.Id, subCategory.Id);

        var instances = await db.MemoStepInstances.Where(x => x.MemoId == result.Id).OrderBy(x => x.SortOrder).ToListAsync();

        Assert.Equal(2, instances.Count);
        Assert.Equal("จัดทำ PR", instances[0].Label);
        Assert.Equal(MemoStepKind.Approval, instances[1].StepKind);
        Assert.All(instances, x => Assert.Equal(MemoStepStatus.Waiting, x.Status));
    }

    [Fact]
    public async Task CreateMemo_WithoutWorkflowSteps_CreatesNoInstances()
    {
        await using var db = MemoTestData.CreateContext();
        var (company, department) = await MemoTestData.SeedOrgAsync(db);
        var (memoType, category, subCategory) = await MemoTestData.SeedTaxonomyAsync(db, company.Id, department.Id);
        var requester = await MemoTestData.SeedEmployeeAsync(db, company.Id, department.Id);

        var result = await CreateMemoAsync(db, requester, memoType.Id, category.Id, subCategory.Id);

        Assert.Empty(await db.MemoStepInstances.Where(x => x.MemoId == result.Id).ToListAsync());
    }

    [Fact]
    public async Task CreateMemo_SnapshotsFirstApproverConfig()
    {
        await using var db = MemoTestData.CreateContext();
        var (company, department) = await MemoTestData.SeedOrgAsync(db);
        var approver = await MemoTestData.SeedEmployeeAsync(db, company.Id, department.Id);
        await MemoTestData.GrantRoleAsync(db, approver, RoleType.Supervisor);
        var (memoType, category, subCategory) = await MemoTestData.SeedTaxonomyAsync(
            db, company.Id, department.Id, RoleType.Supervisor, approver.Id);

        var requester = await MemoTestData.SeedEmployeeAsync(db, company.Id, department.Id);
        var result = await CreateMemoAsync(db, requester, memoType.Id, category.Id, subCategory.Id);

        var memo = await db.Memos.FirstAsync(x => x.Id == result.Id);
        Assert.Equal(RoleType.Supervisor, memo.FirstApproverRoleCodeSnapshot);
        Assert.Equal(approver.Id, memo.FirstApproverEmployeeIdSnapshot);
    }

    [Fact]
    public async Task EditingDefinitionAfterCreate_DoesNotAffectExistingMemo()
    {
        await using var db = MemoTestData.CreateContext();
        var (company, department) = await MemoTestData.SeedOrgAsync(db);
        var (memoType, category, subCategory) = await MemoTestData.SeedTaxonomyAsync(db, company.Id, department.Id);
        var step = await MemoTestData.SeedWorkflowStepAsync(db, memoType.Id, 1, "ชื่อเดิม", MemoStepKind.Work, RoleType.Supervisor);

        var requester = await MemoTestData.SeedEmployeeAsync(db, company.Id, department.Id);
        var result = await CreateMemoAsync(db, requester, memoType.Id, category.Id, subCategory.Id);

        var updateHandler = new UpdateMemoWorkflowStepHandler(db, new TestAuditLogService());
        await updateHandler.Handle(
            new UpdateMemoWorkflowStepCommand(step.Id, "ชื่อใหม่", MemoStepKind.Approval, RoleType.Executive, null, 1),
            CancellationToken.None);

        var instance = await db.MemoStepInstances.FirstAsync(x => x.MemoId == result.Id);
        Assert.Equal("ชื่อเดิม", instance.Label);
        Assert.Equal(MemoStepKind.Work, instance.StepKind);
    }

    [Fact]
    public async Task CreateWorkflowStep_WithDuplicateSortOrder_ThrowsConflict()
    {
        await using var db = MemoTestData.CreateContext();
        var (company, department) = await MemoTestData.SeedOrgAsync(db);
        var (memoType, _, _) = await MemoTestData.SeedTaxonomyAsync(db, company.Id, department.Id);
        await MemoTestData.SeedWorkflowStepAsync(db, memoType.Id, 1, "ขั้นแรก", MemoStepKind.Work, RoleType.Supervisor);

        var handler = new CreateMemoWorkflowStepHandler(db, new TestAuditLogService());

        await Assert.ThrowsAsync<Common.Exceptions.ConflictException>(() =>
            handler.Handle(new CreateMemoWorkflowStepCommand(
                memoType.Id, "ซ้ำลำดับ", MemoStepKind.Work, RoleType.Supervisor, null, 1), CancellationToken.None));
    }

    [Fact]
    public async Task CreateWorkflowStep_WithAssigneeMissingRole_ThrowsConflict()
    {
        await using var db = MemoTestData.CreateContext();
        var (company, department) = await MemoTestData.SeedOrgAsync(db);
        var (memoType, _, _) = await MemoTestData.SeedTaxonomyAsync(db, company.Id, department.Id);
        // พนักงานไม่ได้ถือ role Executive ที่ config ไว้
        var employee = await MemoTestData.SeedEmployeeAsync(db, company.Id, department.Id);

        var handler = new CreateMemoWorkflowStepHandler(db, new TestAuditLogService());

        await Assert.ThrowsAsync<Common.Exceptions.ConflictException>(() =>
            handler.Handle(new CreateMemoWorkflowStepCommand(
                memoType.Id, "อนุมัติ", MemoStepKind.Approval, RoleType.Executive, employee.Id, 1), CancellationToken.None));
    }

    [Fact]
    public async Task ToggleWorkflowStep_SoftDeactivatesInsteadOfDeleting()
    {
        await using var db = MemoTestData.CreateContext();
        var (company, department) = await MemoTestData.SeedOrgAsync(db);
        var (memoType, _, _) = await MemoTestData.SeedTaxonomyAsync(db, company.Id, department.Id);
        var step = await MemoTestData.SeedWorkflowStepAsync(db, memoType.Id, 1, "ขั้นแรก", MemoStepKind.Work, RoleType.Supervisor);

        var handler = new ToggleMemoWorkflowStepStatusHandler(db, new TestAuditLogService());
        await handler.Handle(new ToggleMemoWorkflowStepStatusCommand(step.Id, false), CancellationToken.None);

        var stored = await db.MemoWorkflowSteps.FirstOrDefaultAsync(x => x.Id == step.Id);
        Assert.NotNull(stored);
        Assert.False(stored!.IsActive);
    }

    private static async Task<Hrms.Application.Features.Memos.Dtos.MemoDto> CreateMemoAsync(
        Hrms.Infrastructure.Persistence.HrmsDbContext db, Hrms.Domain.Entities.Employee requester,
        Guid memoTypeId, Guid categoryId, Guid subCategoryId)
    {
        var user = new TestCurrentUser(requester.Id, requester.CompanyId, requester.DepartmentId, RoleType.Employee);
        var handler = new CreateMemoHandler(
            db, user, new TestPermissionService("memo:create"), new TestAuditLogService(),
            new TestMemoNumberGenerator(), new MemoStepAuthorizer(db));
        return await handler.Handle(
            new CreateMemoCommand(memoTypeId, categoryId, subCategoryId, "รายละเอียด"), CancellationToken.None);
    }
}
