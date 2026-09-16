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

// การย้อนขั้นตอน — ขั้นอนุมัติเลือกปลายทางได้ทุกขั้นก่อนหน้า/ผู้ขอ
// ส่วนขั้นดำเนินการส่งคืนได้เฉพาะขั้นก่อนหน้าติดกัน และห้ามย้อนถึงผู้ขอ
public class MemoStepReturnTests
{
    [Fact]
    public async Task ReturnStep_ApprovalSkipsBack_ResetsIntermediateStepsForRewalk()
    {
        await using var db = MemoTestData.CreateContext();
        var ctx = await SeedFourStepMemoAsync(db);

        await ReturnHandler(db, ctx.Executive).Handle(
            new ReturnMemoStepCommand(ctx.Memo.Id, ctx.Steps[3].Id, "ใบเสนอราคาผิดเจ้า",
                TargetStepInstanceId: ctx.Steps[0].Id),
            CancellationToken.None);

        var steps = await StepsAsync(db, ctx.Memo.Id);
        var memo = await db.Memos.FirstAsync(x => x.Id == ctx.Memo.Id);

        // ขั้นกลางต้องกลับเป็น Waiting ไม่ใช่คง Done — ไม่งั้น AdvanceAsync จะข้ามไปหาผู้อนุมัติเลย (ลัดกลับ)
        Assert.Equal(MemoStepStatus.Current, steps[0].Status);
        Assert.Equal(MemoStepStatus.Waiting, steps[1].Status);
        Assert.Equal(MemoStepStatus.Waiting, steps[2].Status);
        Assert.Equal(MemoStepStatus.Waiting, steps[3].Status);
        Assert.All(steps, step => Assert.Null(step.ActedAt));
        Assert.All(steps, step => Assert.Null(step.ActionNote));
        Assert.Equal(steps[0].Id, memo.CurrentStepInstanceId);
        Assert.Equal(MemoStatus.Approved, memo.Status);
    }

    [Fact]
    public async Task ReturnStep_RewalkReachesApproverAgainThroughEveryIntermediateStep()
    {
        await using var db = MemoTestData.CreateContext();
        var ctx = await SeedFourStepMemoAsync(db);

        await ReturnHandler(db, ctx.Executive).Handle(
            new ReturnMemoStepCommand(ctx.Memo.Id, ctx.Steps[3].Id, "ใบเสนอราคาผิดเจ้า",
                TargetStepInstanceId: ctx.Steps[0].Id),
            CancellationToken.None);

        // ปิดขั้นที่ 1 ใหม่ — คิวต้องไปที่ขั้น 2 ไม่ใช่กระโดดข้ามไปขั้นอนุมัติ
        await CompleteHandler(db, ctx.Supervisor).Handle(
            new CompleteMemoStepCommand(ctx.Memo.Id, ctx.Steps[0].Id, "หาใหม่แล้ว"), CancellationToken.None);

        var steps = await StepsAsync(db, ctx.Memo.Id);
        Assert.Equal(MemoStepStatus.Done, steps[0].Status);
        Assert.Equal(MemoStepStatus.Current, steps[1].Status);
        Assert.Equal(MemoStepStatus.Waiting, steps[3].Status);
    }

    [Fact]
    public async Task ReturnStep_ApprovalToLaterStep_ThrowsTargetInvalid()
    {
        await using var db = MemoTestData.CreateContext();
        var ctx = await SeedFourStepMemoAsync(db, currentIndex: 1);

        // ขั้นที่ 2 เป็นคิวปัจจุบัน แต่สั่งย้อนไปขั้นที่ 3 ซึ่งอยู่ข้างหน้า
        var ex = await Assert.ThrowsAsync<ConflictException>(() =>
            ReturnHandler(db, ctx.Supervisor).Handle(
                new ReturnMemoStepCommand(ctx.Memo.Id, ctx.Steps[1].Id, "ขอแก้",
                    TargetStepInstanceId: ctx.Steps[2].Id),
                CancellationToken.None));

        Assert.Equal("MEMO_STEP_RETURN_TARGET_INVALID", ex.Code);
    }

    [Fact]
    public async Task ReturnStep_OnWorkStep_SendsBackToImmediatePreviousStep()
    {
        await using var db = MemoTestData.CreateContext();
        var ctx = await SeedFourStepMemoAsync(db, currentIndex: 2);

        await ReturnHandler(db, ctx.Supervisor).Handle(
            new ReturnMemoStepCommand(ctx.Memo.Id, ctx.Steps[2].Id, "งบยังไม่ผ่าน"),
            CancellationToken.None);

        var steps = await StepsAsync(db, ctx.Memo.Id);
        var memo = await db.Memos.FirstAsync(x => x.Id == ctx.Memo.Id);

        Assert.Equal(MemoStepStatus.Done, steps[0].Status);   // ขั้นก่อนปลายทางไม่ถูกแตะ
        Assert.Equal(MemoStepStatus.Current, steps[1].Status);
        Assert.Equal(MemoStepStatus.Waiting, steps[2].Status);
        Assert.Equal(steps[1].Id, memo.CurrentStepInstanceId);
    }

    [Fact]
    public async Task ReturnStep_WorkStepChoosingDistantTarget_ThrowsNotAllowed()
    {
        await using var db = MemoTestData.CreateContext();
        var ctx = await SeedFourStepMemoAsync(db, currentIndex: 2);

        var ex = await Assert.ThrowsAsync<ConflictException>(() =>
            ReturnHandler(db, ctx.Supervisor).Handle(
                new ReturnMemoStepCommand(ctx.Memo.Id, ctx.Steps[2].Id, "ขอแก้",
                    TargetStepInstanceId: ctx.Steps[0].Id),
                CancellationToken.None));

        Assert.Equal("MEMO_STEP_RETURN_NOT_ALLOWED", ex.Code);
    }

    [Fact]
    public async Task ReturnStep_WorkStepToRequester_ThrowsNotAllowed()
    {
        await using var db = MemoTestData.CreateContext();
        var ctx = await SeedFourStepMemoAsync(db, currentIndex: 2);

        var ex = await Assert.ThrowsAsync<ConflictException>(() =>
            ReturnHandler(db, ctx.Supervisor).Handle(
                new ReturnMemoStepCommand(ctx.Memo.Id, ctx.Steps[2].Id, "ขอแก้", ToRequester: true),
                CancellationToken.None));

        Assert.Equal("MEMO_STEP_RETURN_NOT_ALLOWED", ex.Code);
    }

    [Fact]
    public async Task ReturnStep_ApprovalToRequester_ParksMemoAndClearsEveryStep()
    {
        await using var db = MemoTestData.CreateContext();
        var ctx = await SeedFourStepMemoAsync(db);

        await ReturnHandler(db, ctx.Executive).Handle(
            new ReturnMemoStepCommand(ctx.Memo.Id, ctx.Steps[3].Id, "คำขอไม่ตรงกับที่ประชุมสรุป",
                ToRequester: true),
            CancellationToken.None);

        var steps = await StepsAsync(db, ctx.Memo.Id);
        var memo = await db.Memos.FirstAsync(x => x.Id == ctx.Memo.Id);

        Assert.All(steps, step => Assert.Equal(MemoStepStatus.Waiting, step.Status));
        Assert.Null(memo.CurrentStepInstanceId);
        Assert.NotNull(memo.ReturnedToRequesterAt);
        Assert.Equal("คำขอไม่ตรงกับที่ประชุมสรุป", memo.ReturnedToRequesterReason);
        Assert.Equal(ctx.Steps[3].Id, memo.ReturnedFromStepInstanceId);
        // เรื่องยังไม่ถูกปิด — ต่างจากปุ่ม "ไม่อนุมัติ"
        Assert.Equal(MemoStatus.Approved, memo.Status);
    }

    [Fact]
    public async Task ReturnStep_KeepsClearedWorkInSystemActivityAndNotifiesRequester()
    {
        await using var db = MemoTestData.CreateContext();
        var ctx = await SeedFourStepMemoAsync(db);

        await ReturnHandler(db, ctx.Executive).Handle(
            new ReturnMemoStepCommand(ctx.Memo.Id, ctx.Steps[3].Id, "ใบเสนอราคาผิดเจ้า",
                TargetStepInstanceId: ctx.Steps[0].Id),
            CancellationToken.None);

        var activity = await db.MemoActivities.FirstAsync(x => x.MemoId == ctx.Memo.Id && x.IsSystem);
        Assert.Contains("ใบเสนอราคาผิดเจ้า", activity.Message);
        // โน้ตของขั้นที่ถูกล้างต้องอยู่ในการ์ด ไม่งั้นหายถาวรพร้อมกับ ActionNote
        Assert.Contains("ผลงานเดิมที่ถูกล้าง", activity.Message);
        Assert.Contains("สรุปงานขั้นที่ 1", activity.Message);
        Assert.Contains("สรุปงานขั้นที่ 3", activity.Message);

        var notified = await db.NotificationOutboxes
            .Where(x => x.EntityId == ctx.Memo.Id)
            .Select(x => x.RecipientEmployeeId)
            .ToListAsync();
        Assert.Contains(ctx.Requester.Id, notified);
    }

    [Fact]
    public async Task Resubmit_ByRequester_RestartsFromFirstStep()
    {
        await using var db = MemoTestData.CreateContext();
        var ctx = await SeedFourStepMemoAsync(db);
        await ReturnHandler(db, ctx.Executive).Handle(
            new ReturnMemoStepCommand(ctx.Memo.Id, ctx.Steps[3].Id, "คำขอไม่ครบ", ToRequester: true),
            CancellationToken.None);

        await ResubmitHandler(db, ctx.Requester).Handle(
            new ResubmitMemoCommand(ctx.Memo.Id, "แนบสเปกเพิ่มแล้ว"), CancellationToken.None);

        var steps = await StepsAsync(db, ctx.Memo.Id);
        var memo = await db.Memos.FirstAsync(x => x.Id == ctx.Memo.Id);

        Assert.Equal(MemoStepStatus.Current, steps[0].Status);
        Assert.Equal(steps[0].Id, memo.CurrentStepInstanceId);
        Assert.Null(memo.ReturnedToRequesterAt);
        Assert.Null(memo.ReturnedFromStepInstanceId);
    }

    [Fact]
    public async Task Resubmit_ByUnrelatedEmployee_ThrowsForbidden()
    {
        await using var db = MemoTestData.CreateContext();
        var ctx = await SeedFourStepMemoAsync(db);
        await ReturnHandler(db, ctx.Executive).Handle(
            new ReturnMemoStepCommand(ctx.Memo.Id, ctx.Steps[3].Id, "คำขอไม่ครบ", ToRequester: true),
            CancellationToken.None);

        await Assert.ThrowsAsync<AppForbiddenException>(() =>
            ResubmitHandler(db, ctx.Supervisor).Handle(
                new ResubmitMemoCommand(ctx.Memo.Id, null), CancellationToken.None));
    }

    [Fact]
    public async Task Resubmit_WhenMemoWasNeverReturned_ThrowsConflict()
    {
        await using var db = MemoTestData.CreateContext();
        var ctx = await SeedFourStepMemoAsync(db);

        var ex = await Assert.ThrowsAsync<ConflictException>(() =>
            ResubmitHandler(db, ctx.Requester).Handle(
                new ResubmitMemoCommand(ctx.Memo.Id, null), CancellationToken.None));

        Assert.Equal("MEMO_NOT_RETURNED", ex.Code);
    }

    private static ReturnMemoStepHandler ReturnHandler(HrmsDbContext db, Employee actor)
        => new(db, User(actor), new MemoStepAuthorizer(db), new TestAuditLogService());

    private static CompleteMemoStepHandler CompleteHandler(HrmsDbContext db, Employee actor)
        => new(db, User(actor), new MemoStepAuthorizer(db), new TestAuditLogService());

    private static ResubmitMemoHandler ResubmitHandler(HrmsDbContext db, Employee actor)
        => new(db, User(actor), new MemoStepAuthorizer(db), new TestAuditLogService());

    private static TestCurrentUser User(Employee employee)
        => new(employee.Id, employee.CompanyId, employee.DepartmentId, RoleType.Employee);

    private static Task<List<MemoStepInstance>> StepsAsync(HrmsDbContext db, Guid memoId)
        => db.MemoStepInstances.Where(x => x.MemoId == memoId).OrderBy(x => x.SortOrder).ToListAsync();

    private record ReturnContext(
        Memo Memo, Employee Requester, Employee Supervisor, Employee Executive, List<MemoStepInstance> Steps);

    // เรื่องอนุมัติ+รับทราบแล้ว 4 ขั้น: Work×3 (Supervisor) แล้วปิดท้ายด้วย Approval (Executive)
    // ขั้นก่อน currentIndex ถูกทำเสร็จไปแล้วพร้อมโน้ต เพื่อให้เห็นว่าอะไรถูกล้างตอนย้อน
    private static async Task<ReturnContext> SeedFourStepMemoAsync(HrmsDbContext db, int currentIndex = 3)
    {
        var (company, department) = await MemoTestData.SeedOrgAsync(db);
        var (memoType, category, subCategory) = await MemoTestData.SeedTaxonomyAsync(db, company.Id, department.Id);
        var requester = await MemoTestData.SeedEmployeeAsync(db, company.Id, department.Id, lineUserId: "U-requester");
        var memo = await MemoTestData.SeedMemoAsync(
            db, memoType, category, subCategory, requester, MemoStatus.Approved, acknowledged: true);

        var supervisor = await MemoTestData.SeedEmployeeAsync(db, company.Id, department.Id, lineUserId: "U-supervisor");
        await MemoTestData.GrantRoleAsync(db, supervisor, RoleType.Supervisor, company.Id, department.Id);
        var executive = await MemoTestData.SeedEmployeeAsync(db, company.Id, department.Id, lineUserId: "U-executive");
        await MemoTestData.GrantRoleAsync(db, executive, RoleType.Executive, company.Id, department.Id);

        MemoStepStatus StatusAt(int index) => index < currentIndex
            ? MemoStepStatus.Done
            : index == currentIndex ? MemoStepStatus.Current : MemoStepStatus.Waiting;

        var steps = await MemoTestData.SeedStepInstancesAsync(db, memo,
            (1, "หาใบเสนอราคา", MemoStepKind.Work, RoleType.Supervisor, null, StatusAt(0)),
            (2, "ตรวจงบ", MemoStepKind.Work, RoleType.Supervisor, null, StatusAt(1)),
            (3, "จัดทำใบ PR", MemoStepKind.Work, RoleType.Supervisor, null, StatusAt(2)),
            (4, "ผู้บริหารจัดซื้ออนุมัติ", MemoStepKind.Approval, RoleType.Executive, null, StatusAt(3)));

        foreach (var step in steps.Where(x => x.Status == MemoStepStatus.Done))
        {
            step.ActedAt = DateTime.UtcNow.AddHours(7);
            step.ActedByEmployeeId = supervisor.Id;
            step.ActionNote = $"สรุปงานขั้นที่ {step.SortOrder}";
        }
        await db.SaveChangesAsync();

        return new ReturnContext(memo, requester, supervisor, executive, steps);
    }
}
