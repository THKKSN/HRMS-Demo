using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using Hrms.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Tests.Memos.Support;

// helper seed ที่ใช้ร่วมกันทุกชุดเทสของ Memo workflow
internal static class MemoTestData
{
    public static HrmsDbContext CreateContext(string prefix = "memo")
    {
        var options = new DbContextOptionsBuilder<HrmsDbContext>()
            .UseInMemoryDatabase($"{prefix}-{Guid.NewGuid():N}")
            .Options;
        return new HrmsDbContext(options);
    }

    public static async Task<(Company Company, Department Department)> SeedOrgAsync(HrmsDbContext db)
    {
        var company = new Company { Name = $"บริษัท-{Guid.NewGuid():N}", IsActive = true };
        db.Companies.Add(company);
        var department = new Department { CompanyId = company.Id, Name = "แผนก", IsActive = true };
        db.Departments.Add(department);
        await db.SaveChangesAsync();
        return (company, department);
    }

    public static async Task<Employee> SeedEmployeeAsync(
        HrmsDbContext db, Guid companyId, Guid departmentId, string? lineUserId = null)
    {
        var employee = new Employee
        {
            CompanyId = companyId,
            DepartmentId = departmentId,
            EmployeeCode = $"EMP-{Guid.NewGuid():N}"[..12],
            FirstName = "ทดสอบ",
            LastName = "ระบบ",
            LineUserId = lineUserId,
            IsActive = true,
        };
        db.Employees.Add(employee);
        await db.SaveChangesAsync();
        return employee;
    }

    // grant role — scope null = grant ระดับ global (เห็นทุกบริษัท)
    public static async Task GrantRoleAsync(
        HrmsDbContext db, Employee employee, RoleType roleCode, Guid? companyId = null, Guid? departmentId = null)
    {
        var role = await db.SystemRoles.FirstOrDefaultAsync(x => x.Code == roleCode);
        if (role is null)
        {
            role = new SystemRole { Code = roleCode, NameTh = roleCode.ToString(), IsActive = true };
            db.SystemRoles.Add(role);
        }
        db.EmployeeRoles.Add(new EmployeeRole
        {
            EmployeeId = employee.Id,
            RoleId = role.Id,
            CompanyId = companyId,
            DepartmentId = departmentId,
            IsActive = true,
        });
        await db.SaveChangesAsync();
    }

    public static async Task<(MemoType MemoType, MemoCategory Category, MemoSubCategory SubCategory)> SeedTaxonomyAsync(
        HrmsDbContext db, Guid companyId, Guid departmentId,
        RoleType firstApproverRole = RoleType.Executive, Guid? firstApproverEmployeeId = null)
    {
        var memoType = new MemoType
        {
            Name = $"ประเภท-{Guid.NewGuid():N}",
            CompanyId = companyId,
            DepartmentId = departmentId,
            FirstApproverRoleCode = firstApproverRole,
            FirstApproverEmployeeId = firstApproverEmployeeId,
            IsActive = true,
        };
        db.MemoTypes.Add(memoType);
        var category = new MemoCategory { MemoTypeId = memoType.Id, Name = "หมวดหมู่", IsActive = true };
        db.MemoCategories.Add(category);
        var subCategory = new MemoSubCategory { MemoCategoryId = category.Id, Name = "หัวข้อย่อย", IsActive = true };
        db.MemoSubCategories.Add(subCategory);
        await db.SaveChangesAsync();
        return (memoType, category, subCategory);
    }

    public static async Task<MemoWorkflowStep> SeedWorkflowStepAsync(
        HrmsDbContext db, Guid memoTypeId, int sortOrder, string label,
        MemoStepKind kind, RoleType roleCode, Guid? assigneeEmployeeId = null, bool isActive = true)
    {
        var step = new MemoWorkflowStep
        {
            MemoTypeId = memoTypeId,
            SortOrder = sortOrder,
            Label = label,
            StepKind = kind,
            AssigneeRoleCode = roleCode,
            AssigneeEmployeeId = assigneeEmployeeId,
            IsActive = isActive,
        };
        db.MemoWorkflowSteps.Add(step);
        await db.SaveChangesAsync();
        return step;
    }

    public static async Task<Memo> SeedMemoAsync(
        HrmsDbContext db, MemoType memoType, MemoCategory category, MemoSubCategory subCategory,
        Employee requester, MemoStatus status = MemoStatus.Pending, bool acknowledged = false)
    {
        var memo = new Memo
        {
            MemoNo = $"Memo-{Guid.NewGuid():N}"[..20],
            MemoTypeId = memoType.Id,
            MemoCategoryId = category.Id,
            MemoSubCategoryId = subCategory.Id,
            Detail = "รายละเอียด",
            RequesterId = requester.Id,
            CompanyId = requester.CompanyId,
            DepartmentId = requester.DepartmentId!.Value,
            MemoCategoryNameSnapshot = category.Name,
            MemoSubCategoryNameSnapshot = subCategory.Name,
            FirstApproverRoleCodeSnapshot = memoType.FirstApproverRoleCode,
            FirstApproverEmployeeIdSnapshot = memoType.FirstApproverEmployeeId,
            Status = status,
            ApprovedAt = status == MemoStatus.Approved ? DateTime.UtcNow.AddHours(7) : null,
            AcknowledgedAt = acknowledged ? DateTime.UtcNow.AddHours(7) : null,
            AcknowledgedByEmployeeId = acknowledged ? requester.Id : null,
        };
        db.Memos.Add(memo);
        await db.SaveChangesAsync();
        return memo;
    }

    // สร้าง step instance ของเรื่อง พร้อมกำหนดว่าตัวไหนเป็น Current
    public static async Task<List<MemoStepInstance>> SeedStepInstancesAsync(
        HrmsDbContext db, Memo memo,
        params (int SortOrder, string Label, MemoStepKind Kind, RoleType Role, Guid? AssigneeId, MemoStepStatus Status)[] steps)
    {
        var instances = steps.Select(s => new MemoStepInstance
        {
            MemoId = memo.Id,
            SortOrder = s.SortOrder,
            Label = s.Label,
            StepKind = s.Kind,
            AssigneeRoleCode = s.Role,
            AssigneeEmployeeId = s.AssigneeId,
            Status = s.Status,
        }).ToList();

        db.MemoStepInstances.AddRange(instances);
        memo.CurrentStepInstanceId = instances.FirstOrDefault(x => x.Status == MemoStepStatus.Current)?.Id;
        await db.SaveChangesAsync();
        return instances;
    }
}
