using FluentAssertions;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Features.Memos.Commands;
using Hrms.Application.Tests.Memos.Support;
using Hrms.Application.Tests.Support;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using Hrms.Infrastructure.Persistence;
using Xunit;

namespace Hrms.Application.Tests.Memos;

// กติกาแก้ไขบันทึกความคืบหน้า: เจ้าของบันทึกหรือ Admin เท่านั้น และห้ามแก้บันทึกที่ระบบเขียนเอง
public class UpdateMemoActivityTests
{
    private static async Task<MemoActivity> SeedActivityAsync(
        HrmsDbContext db, Memo memo, Guid? authorId, bool isSystem = false)
    {
        var activity = new MemoActivity
        {
            MemoId = memo.Id,
            AuthorEmployeeId = authorId,
            Message = "ข้อความเดิม",
            IsSystem = isSystem,
        };
        db.MemoActivities.Add(activity);
        await db.SaveChangesAsync();
        return activity;
    }

    private static UpdateMemoActivityHandler CreateHandler(HrmsDbContext db, TestCurrentUser user)
        => new(db, user, new TestAuditLogService());

    [Fact]
    public async Task Author_CanEditOwnNote()
    {
        await using var db = MemoTestData.CreateContext();
        var (company, department) = await MemoTestData.SeedOrgAsync(db);
        var taxonomy = await MemoTestData.SeedTaxonomyAsync(db, company.Id, department.Id);
        var requester = await MemoTestData.SeedEmployeeAsync(db, company.Id, department.Id);
        var memo = await MemoTestData.SeedMemoAsync(
            db, taxonomy.MemoType, taxonomy.Category, taxonomy.SubCategory, requester, MemoStatus.Approved);
        var activity = await SeedActivityAsync(db, memo, requester.Id);

        var user = new TestCurrentUser(requester.Id, company.Id, department.Id, RoleType.Employee);
        var result = await CreateHandler(db, user).Handle(
            new UpdateMemoActivityCommand(memo.Id, activity.Id, "  ข้อความใหม่  "), CancellationToken.None);

        result.Message.Should().Be("ข้อความใหม่");
        result.CanEdit.Should().BeTrue();
    }

    [Fact]
    public async Task OtherEmployee_CannotEditSomeoneElsesNote()
    {
        await using var db = MemoTestData.CreateContext();
        var (company, department) = await MemoTestData.SeedOrgAsync(db);
        var taxonomy = await MemoTestData.SeedTaxonomyAsync(db, company.Id, department.Id);
        var requester = await MemoTestData.SeedEmployeeAsync(db, company.Id, department.Id);
        var memo = await MemoTestData.SeedMemoAsync(
            db, taxonomy.MemoType, taxonomy.Category, taxonomy.SubCategory, requester, MemoStatus.Approved);
        var activity = await SeedActivityAsync(db, memo, requester.Id);

        // Supervisor แผนกปลายทางเพิ่มบันทึกได้ แต่แก้ของคนอื่นไม่ได้
        var supervisor = await MemoTestData.SeedEmployeeAsync(db, company.Id, department.Id);
        await MemoTestData.GrantRoleAsync(db, supervisor, RoleType.Supervisor, company.Id, department.Id);
        var user = new TestCurrentUser(supervisor.Id, company.Id, department.Id, RoleType.Supervisor);

        await Assert.ThrowsAsync<AppForbiddenException>(() => CreateHandler(db, user).Handle(
            new UpdateMemoActivityCommand(memo.Id, activity.Id, "แก้แทน"), CancellationToken.None));
    }

    [Fact]
    public async Task Admin_CanEditAnyNote()
    {
        await using var db = MemoTestData.CreateContext();
        var (company, department) = await MemoTestData.SeedOrgAsync(db);
        var taxonomy = await MemoTestData.SeedTaxonomyAsync(db, company.Id, department.Id);
        var requester = await MemoTestData.SeedEmployeeAsync(db, company.Id, department.Id);
        var memo = await MemoTestData.SeedMemoAsync(
            db, taxonomy.MemoType, taxonomy.Category, taxonomy.SubCategory, requester, MemoStatus.Approved);
        var activity = await SeedActivityAsync(db, memo, requester.Id);

        var admin = await MemoTestData.SeedEmployeeAsync(db, company.Id, department.Id);
        var user = new TestCurrentUser(admin.Id, company.Id, department.Id, RoleType.Admin);

        var result = await CreateHandler(db, user).Handle(
            new UpdateMemoActivityCommand(memo.Id, activity.Id, "แก้โดย admin"), CancellationToken.None);

        result.Message.Should().Be("แก้โดย admin");
    }

    [Fact]
    public async Task SystemNote_CannotBeEditedEvenByAdmin()
    {
        await using var db = MemoTestData.CreateContext();
        var (company, department) = await MemoTestData.SeedOrgAsync(db);
        var taxonomy = await MemoTestData.SeedTaxonomyAsync(db, company.Id, department.Id);
        var requester = await MemoTestData.SeedEmployeeAsync(db, company.Id, department.Id);
        var memo = await MemoTestData.SeedMemoAsync(
            db, taxonomy.MemoType, taxonomy.Category, taxonomy.SubCategory, requester, MemoStatus.Approved);
        // บันทึกของระบบ เช่น ร่องรอยการตีกลับ — เป็นหลักฐานของ flow ไม่ใช่ข้อความของคน
        var activity = await SeedActivityAsync(db, memo, authorId: null, isSystem: true);

        var admin = await MemoTestData.SeedEmployeeAsync(db, company.Id, department.Id);
        var user = new TestCurrentUser(admin.Id, company.Id, department.Id, RoleType.Admin);

        await Assert.ThrowsAsync<AppForbiddenException>(() => CreateHandler(db, user).Handle(
            new UpdateMemoActivityCommand(memo.Id, activity.Id, "แก้ร่องรอยระบบ"), CancellationToken.None));
    }

    [Fact]
    public async Task RejectedMemo_LocksEditing()
    {
        await using var db = MemoTestData.CreateContext();
        var (company, department) = await MemoTestData.SeedOrgAsync(db);
        var taxonomy = await MemoTestData.SeedTaxonomyAsync(db, company.Id, department.Id);
        var requester = await MemoTestData.SeedEmployeeAsync(db, company.Id, department.Id);
        var memo = await MemoTestData.SeedMemoAsync(
            db, taxonomy.MemoType, taxonomy.Category, taxonomy.SubCategory, requester, MemoStatus.Rejected);
        var activity = await SeedActivityAsync(db, memo, requester.Id);

        var user = new TestCurrentUser(requester.Id, company.Id, department.Id, RoleType.Employee);

        await Assert.ThrowsAsync<ConflictException>(() => CreateHandler(db, user).Handle(
            new UpdateMemoActivityCommand(memo.Id, activity.Id, "แก้หลังถูกปฏิเสธ"), CancellationToken.None));
    }
}
