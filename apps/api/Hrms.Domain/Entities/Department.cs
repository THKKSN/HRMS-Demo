using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public class Department : BaseEntity
{
    public Guid CompanyId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? DeptType { get; set; }
    public Guid? ParentDeptId { get; set; }
    public bool IsActive { get; set; } = true;

    public Company Company { get; set; } = null!;
    public Department? ParentDept { get; set; }
    public ICollection<Employee> Employees { get; set; } = new List<Employee>();
}
