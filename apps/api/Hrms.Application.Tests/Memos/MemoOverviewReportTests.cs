using FluentAssertions;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Features.MemoReports;
using Hrms.Application.Tests.Memos.Support;
using Hrms.Application.Tests.Support;
using Hrms.Domain.Enums;
using Xunit;

namespace Hrms.Application.Tests.Memos;

// ภาพรวม Memo บน dashboard — ล็อกขอบเขตต่อบทบาท (Admin/Executive เห็นทุกบริษัท · Supervisor เห็นเฉพาะแผนกปลายทาง)
// และการนับสถานะ ให้ตัวเลขบน dashboard ตรงกับรายการที่เปิดดูได้จริง
public class MemoOverviewReportTests
{
    private static GetMemoOverviewHandler CreateHandler(
        Hrms.Infrastructure.Persistence.HrmsDbContext db, TestCurrentUser user, params string[] permissions)
        => new(db, user, new TestPermissionService(permissions));

    private static GetMemoOverviewQuery Query() => new(new MemoReportFilter(null, null, null));

    [Fact]
    public async Task WithoutMemoPermission_ThrowsForbidden()
    {
        await using var db = MemoTestData.CreateContext();
        var (company, department) = await MemoTestData.SeedOrgAsync(db);
        var employee = await MemoTestData.SeedEmployeeAsync(db, company.Id, department.Id);

        // memo:create/view-own ไม่พอ — ต้องมี memo:approve หรือ memo:view-inbox
        var user = new TestCurrentUser(employee.Id, company.Id, department.Id, RoleType.Employee);
        var handler = CreateHandler(db, user, "memo:create", "memo:view-own");

        await Assert.ThrowsAsync<AppForbiddenException>(() => handler.Handle(Query(), CancellationToken.None));
    }

    [Fact]
    public async Task Executive_SeesEveryCompanyAndCountsByStatus()
    {
        await using var db = MemoTestData.CreateContext();
        var (companyA, departmentA) = await MemoTestData.SeedOrgAsync(db);
        var (companyB, departmentB) = await MemoTestData.SeedOrgAsync(db);
        var typeA = await MemoTestData.SeedTaxonomyAsync(db, companyA.Id, departmentA.Id);
        var typeB = await MemoTestData.SeedTaxonomyAsync(db, companyB.Id, departmentB.Id);
        var requester = await MemoTestData.SeedEmployeeAsync(db, companyA.Id, departmentA.Id);

        await MemoTestData.SeedMemoAsync(db, typeA.MemoType, typeA.Category, typeA.SubCategory, requester);
        await MemoTestData.SeedMemoAsync(db, typeA.MemoType, typeA.Category, typeA.SubCategory, requester);
        await MemoTestData.SeedMemoAsync(db, typeA.MemoType, typeA.Category, typeA.SubCategory, requester, MemoStatus.Approved);
        await MemoTestData.SeedMemoAsync(db, typeB.MemoType, typeB.Category, typeB.SubCategory, requester, MemoStatus.Rejected);

        var executive = await MemoTestData.SeedEmployeeAsync(db, companyA.Id, departmentA.Id);
        var user = new TestCurrentUser(executive.Id, companyA.Id, departmentA.Id, RoleType.Executive);
        var handler = CreateHandler(db, user, "memo:approve");

        var result = await handler.Handle(Query(), CancellationToken.None);

        result.Meta.AppliedScope.Should().Be("All");
        result.TotalCount.Should().Be(4);
        result.PendingCount.Should().Be(2);
        result.InProgressCount.Should().Be(1);
        result.CompletedCount.Should().Be(0);
        result.RejectedCount.Should().Be(1);

        // เรียงจากหัวข้อที่ถูกขอมากที่สุด — typeA 3 เรื่อง มาก่อน typeB 1 เรื่อง
        result.TopTopics.Should().HaveCount(2);
        result.TopTopics[0].MemoTypeId.Should().Be(typeA.MemoType.Id);
        result.TopTopics[0].TotalCount.Should().Be(3);
        result.TopTopics[0].PendingCount.Should().Be(2);
        result.TopTopics[0].InProgressCount.Should().Be(1);
        result.TopTopics[0].TargetDepartmentName.Should().Be(departmentA.Name);
        result.TopTopics[1].MemoTypeId.Should().Be(typeB.MemoType.Id);
        result.TopTopics[1].RejectedCount.Should().Be(1);
    }

    [Fact]
    public async Task Supervisor_SeesOnlyMemosTargetingOwnDepartment()
    {
        await using var db = MemoTestData.CreateContext();
        var (ownCompany, ownDepartment) = await MemoTestData.SeedOrgAsync(db);
        var (otherCompany, otherDepartment) = await MemoTestData.SeedOrgAsync(db);
        var ownType = await MemoTestData.SeedTaxonomyAsync(db, ownCompany.Id, ownDepartment.Id);
        var otherType = await MemoTestData.SeedTaxonomyAsync(db, otherCompany.Id, otherDepartment.Id);
        var requester = await MemoTestData.SeedEmployeeAsync(db, otherCompany.Id, otherDepartment.Id);

        await MemoTestData.SeedMemoAsync(db, ownType.MemoType, ownType.Category, ownType.SubCategory, requester);
        await MemoTestData.SeedMemoAsync(db, otherType.MemoType, otherType.Category, otherType.SubCategory, requester);

        var supervisor = await MemoTestData.SeedEmployeeAsync(db, ownCompany.Id, ownDepartment.Id);
        await MemoTestData.GrantRoleAsync(db, supervisor, RoleType.Supervisor, ownCompany.Id, ownDepartment.Id);
        var user = new TestCurrentUser(supervisor.Id, ownCompany.Id, ownDepartment.Id, RoleType.Supervisor);
        var handler = CreateHandler(db, user, "memo:view-inbox");

        var result = await handler.Handle(Query(), CancellationToken.None);

        result.Meta.AppliedScope.Should().Be("SupervisorScope");
        result.TotalCount.Should().Be(1);
        result.TopTopics.Should().ContainSingle()
            .Which.MemoTypeId.Should().Be(ownType.MemoType.Id);
    }

    [Fact]
    public async Task ReceivedMemo_CountsAsCompletedNotInProgress()
    {
        await using var db = MemoTestData.CreateContext();
        var (company, department) = await MemoTestData.SeedOrgAsync(db);
        var taxonomy = await MemoTestData.SeedTaxonomyAsync(db, company.Id, department.Id);
        var requester = await MemoTestData.SeedEmployeeAsync(db, company.Id, department.Id);

        var memo = await MemoTestData.SeedMemoAsync(
            db, taxonomy.MemoType, taxonomy.Category, taxonomy.SubCategory, requester, MemoStatus.Approved);
        memo.ReceivedAt = DateTime.UtcNow.AddHours(7);
        memo.ReceivedByEmployeeId = requester.Id;
        await db.SaveChangesAsync();

        var admin = await MemoTestData.SeedEmployeeAsync(db, company.Id, department.Id);
        var user = new TestCurrentUser(admin.Id, company.Id, department.Id, RoleType.Admin);
        var handler = CreateHandler(db, user, "memo:approve");

        var result = await handler.Handle(Query(), CancellationToken.None);

        result.InProgressCount.Should().Be(0);
        result.CompletedCount.Should().Be(1);
        result.TopTopics.Should().ContainSingle().Which.CompletedCount.Should().Be(1);
    }
}
