using Hrms.Application.Common.Exceptions;
using Hrms.Application.Features.Memos.Commands;
using Hrms.Application.Features.Memos.Services;
using Hrms.Application.Tests.Memos.Support;
using Hrms.Application.Tests.Support;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using Hrms.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Hrms.Application.Tests.Memos;

// การดำเนินการรายขั้นตอน: สิทธิ์, การเลื่อนขั้น, ไม่อนุมัติ (จบเรื่อง), ตีกลับ, และ guard ตอนส่งมอบ
public class MemoStepActionTests
{
    [Fact]
    public async Task CompleteStep_ByAssignedSupervisor_AdvancesToNextStep()
    {
        await using var db = MemoTestData.CreateContext();
        var ctx = await SeedTwoStepMemoAsync(db);

        var handler = new CompleteMemoStepHandler(
            db, User(ctx.Supervisor), new MemoStepAuthorizer(db), new TestAuditLogService());
        await handler.Handle(new CompleteMemoStepCommand(ctx.Memo.Id, ctx.Steps[0].Id, "ทำเสร็จแล้ว"), CancellationToken.None);

        var steps = await db.MemoStepInstances.Where(x => x.MemoId == ctx.Memo.Id).OrderBy(x => x.SortOrder).ToListAsync();
        var memo = await db.Memos.FirstAsync(x => x.Id == ctx.Memo.Id);

        Assert.Equal(MemoStepStatus.Done, steps[0].Status);
        Assert.Equal(ctx.Supervisor.Id, steps[0].ActedByEmployeeId);
        Assert.Equal(MemoStepStatus.Current, steps[1].Status);
        Assert.Equal(steps[1].Id, memo.CurrentStepInstanceId);
    }

    [Fact]
    public async Task CompleteStep_ByUnrelatedEmployee_ThrowsForbidden()
    {
        await using var db = MemoTestData.CreateContext();
        var ctx = await SeedTwoStepMemoAsync(db);
        var outsider = await MemoTestData.SeedEmployeeAsync(db, ctx.Company.Id, ctx.Department.Id);

        var handler = new CompleteMemoStepHandler(
            db, User(outsider), new MemoStepAuthorizer(db), new TestAuditLogService());

        await Assert.ThrowsAsync<AppForbiddenException>(() =>
            handler.Handle(new CompleteMemoStepCommand(ctx.Memo.Id, ctx.Steps[0].Id, null), CancellationToken.None));
    }

    [Fact]
    public async Task CompleteStep_OnApprovalStep_ThrowsKindMismatch()
    {
        await using var db = MemoTestData.CreateContext();
        var ctx = await SeedTwoStepMemoAsync(db, currentIndex: 1);

        var handler = new CompleteMemoStepHandler(
            db, User(ctx.Executive), new MemoStepAuthorizer(db), new TestAuditLogService());

        var ex = await Assert.ThrowsAsync<ConflictException>(() =>
            handler.Handle(new CompleteMemoStepCommand(ctx.Memo.Id, ctx.Steps[1].Id, null), CancellationToken.None));
        // code แยกตามชนิดขั้นตอนแล้ว (งาน 3.7) — ขั้นอนุมัติต้องใช้ปุ่มอนุมัติ ไม่ใช่ปุ่มดำเนินการเสร็จ
        Assert.Equal("MEMO_STEP_IS_APPROVAL", ex.Code);
    }

    [Fact]
    public async Task CompleteStep_OnNonCurrentStep_ThrowsConflict()
    {
        await using var db = MemoTestData.CreateContext();
        var ctx = await SeedTwoStepMemoAsync(db);

        // ขั้นที่ 2 ยังเป็น Waiting — ข้ามลำดับไม่ได้
        var handler = new ApproveMemoStepHandler(
            db, User(ctx.Executive), new MemoStepAuthorizer(db), new TestAuditLogService());

        var ex = await Assert.ThrowsAsync<ConflictException>(() =>
            handler.Handle(new ApproveMemoStepCommand(ctx.Memo.Id, ctx.Steps[1].Id, null), CancellationToken.None));
        Assert.Equal("MEMO_STEP_NOT_CURRENT", ex.Code);
    }

    [Fact]
    public async Task ApproveLastStep_ClearsCurrentStepPointer()
    {
        await using var db = MemoTestData.CreateContext();
        var ctx = await SeedTwoStepMemoAsync(db, currentIndex: 1);

        var handler = new ApproveMemoStepHandler(
            db, User(ctx.Executive), new MemoStepAuthorizer(db), new TestAuditLogService());
        await handler.Handle(new ApproveMemoStepCommand(ctx.Memo.Id, ctx.Steps[1].Id, "ผ่าน"), CancellationToken.None);

        var memo = await db.Memos.FirstAsync(x => x.Id == ctx.Memo.Id);
        Assert.Null(memo.CurrentStepInstanceId);
        Assert.Equal(MemoStatus.Approved, memo.Status);
    }

    [Fact]
    public async Task RejectStep_EndsMemoAsRejected()
    {
        await using var db = MemoTestData.CreateContext();
        var ctx = await SeedTwoStepMemoAsync(db, currentIndex: 1);

        var handler = new RejectMemoStepHandler(
            db, User(ctx.Executive), new MemoStepAuthorizer(db), new TestAuditLogService());
        await handler.Handle(new RejectMemoStepCommand(ctx.Memo.Id, ctx.Steps[1].Id, "งบไม่พอ"), CancellationToken.None);

        var memo = await db.Memos.FirstAsync(x => x.Id == ctx.Memo.Id);
        var step = await db.MemoStepInstances.FirstAsync(x => x.Id == ctx.Steps[1].Id);

        Assert.Equal(MemoStatus.Rejected, memo.Status);
        Assert.Equal("งบไม่พอ", memo.RejectReason);
        Assert.Equal(MemoStepStatus.Rejected, step.Status);
        Assert.Null(memo.CurrentStepInstanceId);
    }

    [Fact]
    public async Task ReturnStep_SendsPreviousStepBackToCurrentWithSystemActivity()
    {
        await using var db = MemoTestData.CreateContext();
        var ctx = await SeedTwoStepMemoAsync(db, currentIndex: 1, firstStepDone: true);

        var handler = new ReturnMemoStepHandler(
            db, User(ctx.Executive), new MemoStepAuthorizer(db), new TestAuditLogService());
        await handler.Handle(new ReturnMemoStepCommand(ctx.Memo.Id, ctx.Steps[1].Id, "เอกสารไม่ครบ"), CancellationToken.None);

        var steps = await db.MemoStepInstances.Where(x => x.MemoId == ctx.Memo.Id).OrderBy(x => x.SortOrder).ToListAsync();
        var memo = await db.Memos.FirstAsync(x => x.Id == ctx.Memo.Id);
        var activity = await db.MemoActivities.FirstOrDefaultAsync(x => x.MemoId == ctx.Memo.Id && x.IsSystem);

        Assert.Equal(MemoStepStatus.Current, steps[0].Status);
        Assert.Null(steps[0].ActedAt);
        Assert.Equal(MemoStepStatus.Waiting, steps[1].Status);
        Assert.Equal(steps[0].Id, memo.CurrentStepInstanceId);
        Assert.Equal(MemoStatus.Approved, memo.Status);
        Assert.NotNull(activity);
        Assert.Contains("เอกสารไม่ครบ", activity!.Message);
    }

    [Fact]
    public async Task ReturnStep_OnFirstStep_ThrowsNoPrevious()
    {
        await using var db = MemoTestData.CreateContext();
        var (company, department) = await MemoTestData.SeedOrgAsync(db);
        var (memoType, category, subCategory) = await MemoTestData.SeedTaxonomyAsync(db, company.Id, department.Id);
        var requester = await MemoTestData.SeedEmployeeAsync(db, company.Id, department.Id);
        var memo = await MemoTestData.SeedMemoAsync(db, memoType, category, subCategory, requester, MemoStatus.Approved, acknowledged: true);
        var executive = await MemoTestData.SeedEmployeeAsync(db, company.Id, department.Id);
        await MemoTestData.GrantRoleAsync(db, executive, RoleType.Executive, company.Id, department.Id);

        var steps = await MemoTestData.SeedStepInstancesAsync(db, memo,
            (1, "อนุมัติ", MemoStepKind.Approval, RoleType.Executive, null, MemoStepStatus.Current));

        var handler = new ReturnMemoStepHandler(
            db, User(executive), new MemoStepAuthorizer(db), new TestAuditLogService());

        var ex = await Assert.ThrowsAsync<ConflictException>(() =>
            handler.Handle(new ReturnMemoStepCommand(memo.Id, steps[0].Id, "ขอแก้"), CancellationToken.None));
        Assert.Equal("MEMO_STEP_NO_PREVIOUS", ex.Code);
    }

    [Fact]
    public async Task DeliverMemo_WithIncompleteSteps_ThrowsConflict()
    {
        await using var db = MemoTestData.CreateContext();
        var ctx = await SeedTwoStepMemoAsync(db);

        var handler = new DeliverMemoHandler(
            db, User(ctx.Supervisor), new TestPermissionService("memo:view-inbox"), new TestAuditLogService());

        var ex = await Assert.ThrowsAsync<ConflictException>(() =>
            handler.Handle(new DeliverMemoCommand(ctx.Memo.Id), CancellationToken.None));
        Assert.Equal("MEMO_STEPS_INCOMPLETE", ex.Code);
    }

    [Fact]
    public async Task DeliverMemo_WithoutAnySteps_StillWorks()
    {
        await using var db = MemoTestData.CreateContext();
        var (company, department) = await MemoTestData.SeedOrgAsync(db);
        var (memoType, category, subCategory) = await MemoTestData.SeedTaxonomyAsync(db, company.Id, department.Id);
        var requester = await MemoTestData.SeedEmployeeAsync(db, company.Id, department.Id);
        var memo = await MemoTestData.SeedMemoAsync(db, memoType, category, subCategory, requester, MemoStatus.Approved, acknowledged: true);
        var supervisor = await MemoTestData.SeedEmployeeAsync(db, company.Id, department.Id);
        await MemoTestData.GrantRoleAsync(db, supervisor, RoleType.Supervisor, company.Id, department.Id);

        var handler = new DeliverMemoHandler(
            db, User(supervisor), new TestPermissionService("memo:view-inbox"), new TestAuditLogService());
        var result = await handler.Handle(new DeliverMemoCommand(memo.Id), CancellationToken.None);

        Assert.NotNull(result.DeliveredAt);
    }

    [Fact]
    public async Task AcknowledgeMemo_StartsFirstStep()
    {
        await using var db = MemoTestData.CreateContext();
        var (company, department) = await MemoTestData.SeedOrgAsync(db);
        var (memoType, category, subCategory) = await MemoTestData.SeedTaxonomyAsync(db, company.Id, department.Id);
        var requester = await MemoTestData.SeedEmployeeAsync(db, company.Id, department.Id);
        var memo = await MemoTestData.SeedMemoAsync(db, memoType, category, subCategory, requester, MemoStatus.Approved);
        await MemoTestData.SeedStepInstancesAsync(db, memo,
            (1, "จัดทำ PR", MemoStepKind.Work, RoleType.Supervisor, null, MemoStepStatus.Waiting),
            (2, "อนุมัติ", MemoStepKind.Approval, RoleType.Executive, null, MemoStepStatus.Waiting));

        var supervisor = await MemoTestData.SeedEmployeeAsync(db, company.Id, department.Id);
        await MemoTestData.GrantRoleAsync(db, supervisor, RoleType.Supervisor, company.Id, department.Id);

        var handler = new AcknowledgeMemoHandler(
            db, User(supervisor), new TestPermissionService("memo:view-inbox"),
            new MemoStepAuthorizer(db), new TestAuditLogService());
        await handler.Handle(new AcknowledgeMemoCommand(memo.Id), CancellationToken.None);

        var steps = await db.MemoStepInstances.Where(x => x.MemoId == memo.Id).OrderBy(x => x.SortOrder).ToListAsync();
        var stored = await db.Memos.FirstAsync(x => x.Id == memo.Id);

        Assert.Equal(MemoStepStatus.Current, steps[0].Status);
        Assert.Equal(MemoStepStatus.Waiting, steps[1].Status);
        Assert.Equal(steps[0].Id, stored.CurrentStepInstanceId);
    }

    private static TestCurrentUser User(Employee employee)
        => new(employee.Id, employee.CompanyId, employee.DepartmentId, RoleType.Employee);

    private record StepMemoContext(
        Company Company, Department Department, Memo Memo,
        Employee Supervisor, Employee Executive, List<MemoStepInstance> Steps);

    // เรื่องที่อนุมัติ+รับทราบแล้ว มี 2 ขั้น: (1) Work/Supervisor (2) Approval/Executive
    private static async Task<StepMemoContext> SeedTwoStepMemoAsync(
        HrmsDbContext db, int currentIndex = 0, bool firstStepDone = false)
    {
        var (company, department) = await MemoTestData.SeedOrgAsync(db);
        var (memoType, category, subCategory) = await MemoTestData.SeedTaxonomyAsync(db, company.Id, department.Id);
        var requester = await MemoTestData.SeedEmployeeAsync(db, company.Id, department.Id);
        var memo = await MemoTestData.SeedMemoAsync(db, memoType, category, subCategory, requester, MemoStatus.Approved, acknowledged: true);

        var supervisor = await MemoTestData.SeedEmployeeAsync(db, company.Id, department.Id);
        await MemoTestData.GrantRoleAsync(db, supervisor, RoleType.Supervisor, company.Id, department.Id);
        var executive = await MemoTestData.SeedEmployeeAsync(db, company.Id, department.Id);
        await MemoTestData.GrantRoleAsync(db, executive, RoleType.Executive, company.Id, department.Id);

        var firstStatus = currentIndex == 0
            ? MemoStepStatus.Current
            : firstStepDone ? MemoStepStatus.Done : MemoStepStatus.Waiting;
        var steps = await MemoTestData.SeedStepInstancesAsync(db, memo,
            (1, "จัดทำ PR", MemoStepKind.Work, RoleType.Supervisor, null, firstStatus),
            (2, "อนุมัติรอบสอง", MemoStepKind.Approval, RoleType.Executive, null,
                currentIndex == 1 ? MemoStepStatus.Current : MemoStepStatus.Waiting));

        return new StepMemoContext(company, department, memo, supervisor, executive, steps);
    }
}
