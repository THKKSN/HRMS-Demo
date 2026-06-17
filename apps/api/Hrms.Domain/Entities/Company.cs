using Hrms.Domain.Common;
using Hrms.Domain.Enums;

namespace Hrms.Domain.Entities;

public class Company : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? NameEn { get; set; }
    public string? TaxId { get; set; }
    public OrgType OrgType { get; set; }
    public Guid? ParentId { get; set; }
    public bool IsHrManagedByParent { get; set; }
    public bool IsActive { get; set; } = true;
    public WorkDayFlags WorkDays { get; set; } = WorkDayFlags.MonToFri;

    public Company? Parent { get; set; }
    public ICollection<Company> Children { get; set; } = new List<Company>();
    public ICollection<Department> Departments { get; set; } = new List<Department>();
    public ICollection<Employee> Employees { get; set; } = new List<Employee>();
}
