using Hrms.Application.Common.Exceptions;
using Hrms.Application.Features.Memos.Commands;
using Hrms.Application.Features.Memos.Queries;
using Hrms.Application.Features.Memos.Services;
using Hrms.Application.Tests.Memos.Support;
using Hrms.Application.Tests.Support;
using Hrms.Domain.Enums;
using Xunit;

namespace Hrms.Application.Tests.Memos;

// permission gate ของการสร้าง/ดูเรื่อง (memo:create, memo:view-own)
// และ authorization ของการอนุมัติซึ่ง resolve จาก role snapshot ของเรื่อง (ไม่ใช่ permission แล้ว)
public class MemoPermissionTests
{
    [Fact]
    public async Task CreateMemo_WithoutPermission_ThrowsForbidden()
    {
        await using var db = MemoTestData.CreateContext();
        var (company, department) = await MemoTestData.SeedOrgAsync(db);
        var (memoType, category, subCategory) = await MemoTestData.SeedTaxonomyAsync(db, company.Id, department.Id);
        var requester = await MemoTestData.SeedEmployeeAsync(db, company.Id, department.Id);

        var user = new TestCurrentUser(requester.Id, requester.CompanyId, requester.DepartmentId, RoleType.Employee);
        var handler = new CreateMemoHandler(
            db, user, new TestPermissionService(), new TestAuditLogService(),
            new TestMemoNumberGenerator(), new MemoStepAuthorizer(db));

        await Assert.ThrowsAsync<AppForbiddenException>(() =>
            handler.Handle(new CreateMemoCommand(memoType.Id, category.Id, subCategory.Id, "รายละเอียด"), CancellationToken.None));
    }

    [Fact]
    public async Task CreateMemo_WithPermission_Succeeds()
    {
        await using var db = MemoTestData.CreateContext();
        var (company, department) = await MemoTestData.SeedOrgAsync(db);
        var (memoType, category, subCategory) = await MemoTestData.SeedTaxonomyAsync(db, company.Id, department.Id);
        var requester = await MemoTestData.SeedEmployeeAsync(db, company.Id, department.Id);

        var user = new TestCurrentUser(requester.Id, requester.CompanyId, requester.DepartmentId, RoleType.Employee);
        var handler = new CreateMemoHandler(
            db, user, new TestPermissionService("memo:create"), new TestAuditLogService(),
            new TestMemoNumberGenerator(), new MemoStepAuthorizer(db));

        var result = await handler.Handle(new CreateMemoCommand(memoType.Id, category.Id, subCategory.Id, "รายละเอียด"), CancellationToken.None);

        Assert.Equal(MemoStatus.Pending, result.Status);
    }

    [Fact]
    public async Task ApproveMemo_WithoutExecutiveRole_ThrowsForbidden()
    {
        await using var db = MemoTestData.CreateContext();
        var (company, department) = await MemoTestData.SeedOrgAsync(db);
        var (memoType, category, subCategory) = await MemoTestData.SeedTaxonomyAsync(db, company.Id, department.Id);
        var requester = await MemoTestData.SeedEmployeeAsync(db, company.Id, department.Id);
        var memo = await MemoTestData.SeedMemoAsync(db, memoType, category, subCategory, requester);

        // พนักงานธรรมดาไม่มี role Executive — อนุมัติไม่ได้แม้จะถือ permission memo:approve
        var approver = await MemoTestData.SeedEmployeeAsync(db, company.Id, department.Id);
        var user = new TestCurrentUser(approver.Id, approver.CompanyId, approver.DepartmentId, RoleType.Employee);
        var handler = new ApproveMemoHandler(db, user, new MemoStepAuthorizer(db), new TestAuditLogService());

        await Assert.ThrowsAsync<AppForbiddenException>(() =>
            handler.Handle(new ApproveMemoCommand(memo.Id, null), CancellationToken.None));
    }

    [Fact]
    public async Task ApproveMemo_WithExecutiveRole_Succeeds()
    {
        await using var db = MemoTestData.CreateContext();
        var (company, department) = await MemoTestData.SeedOrgAsync(db);
        var (memoType, category, subCategory) = await MemoTestData.SeedTaxonomyAsync(db, company.Id, department.Id);
        var requester = await MemoTestData.SeedEmployeeAsync(db, company.Id, department.Id);
        var memo = await MemoTestData.SeedMemoAsync(db, memoType, category, subCategory, requester);

        var approver = await MemoTestData.SeedEmployeeAsync(db, company.Id, department.Id);
        await MemoTestData.GrantRoleAsync(db, approver, RoleType.Executive);
        var user = new TestCurrentUser(approver.Id, approver.CompanyId, approver.DepartmentId, RoleType.Executive);
        var handler = new ApproveMemoHandler(db, user, new MemoStepAuthorizer(db), new TestAuditLogService());

        var result = await handler.Handle(new ApproveMemoCommand(memo.Id, null), CancellationToken.None);

        Assert.Equal(MemoStatus.Approved, result.Status);
    }

    [Fact]
    public async Task RejectMemo_WithoutExecutiveRole_ThrowsForbidden()
    {
        await using var db = MemoTestData.CreateContext();
        var (company, department) = await MemoTestData.SeedOrgAsync(db);
        var (memoType, category, subCategory) = await MemoTestData.SeedTaxonomyAsync(db, company.Id, department.Id);
        var requester = await MemoTestData.SeedEmployeeAsync(db, company.Id, department.Id);
        var memo = await MemoTestData.SeedMemoAsync(db, memoType, category, subCategory, requester);

        var approver = await MemoTestData.SeedEmployeeAsync(db, company.Id, department.Id);
        var user = new TestCurrentUser(approver.Id, approver.CompanyId, approver.DepartmentId, RoleType.Employee);
        var handler = new RejectMemoHandler(db, user, new MemoStepAuthorizer(db), new TestAuditLogService());

        await Assert.ThrowsAsync<AppForbiddenException>(() =>
            handler.Handle(new RejectMemoCommand(memo.Id, "ไม่อนุมัติ"), CancellationToken.None));
    }

    [Fact]
    public async Task GetMyMemos_WithoutPermission_ThrowsForbidden()
    {
        await using var db = MemoTestData.CreateContext();
        var (company, department) = await MemoTestData.SeedOrgAsync(db);
        var requester = await MemoTestData.SeedEmployeeAsync(db, company.Id, department.Id);

        var user = new TestCurrentUser(requester.Id, requester.CompanyId, requester.DepartmentId, RoleType.Employee);
        var handler = new GetMyMemosHandler(db, user, new TestPermissionService());

        await Assert.ThrowsAsync<AppForbiddenException>(() =>
            handler.Handle(new GetMyMemosQuery(null), CancellationToken.None));
    }

    [Fact]
    public async Task GetMyMemos_WithPermission_Succeeds()
    {
        await using var db = MemoTestData.CreateContext();
        var (company, department) = await MemoTestData.SeedOrgAsync(db);
        var requester = await MemoTestData.SeedEmployeeAsync(db, company.Id, department.Id);

        var user = new TestCurrentUser(requester.Id, requester.CompanyId, requester.DepartmentId, RoleType.Employee);
        var handler = new GetMyMemosHandler(db, user, new TestPermissionService("memo:view-own"));

        var result = await handler.Handle(new GetMyMemosQuery(null), CancellationToken.None);

        Assert.Empty(result);
    }
}
