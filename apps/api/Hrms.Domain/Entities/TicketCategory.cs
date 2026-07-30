using Hrms.Domain.Common;
using Hrms.Domain.Enums;

namespace Hrms.Domain.Entities;

public class TicketCategory : BaseEntity
{
    public Guid CompanyId { get; set; }
    public Guid DepartmentId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
    public Guid? CreatedByEmployeeId { get; set; }
    public bool EnableResponsibilityFallback { get; set; }
    public TicketRoutingMode RoutingMode { get; set; } = TicketRoutingMode.SupervisorAssign;

    public Company Company { get; set; } = null!;
    public Department Department { get; set; } = null!;
    public Employee? CreatedByEmployee { get; set; }
    public ICollection<TicketTopic> Topics { get; set; } = new List<TicketTopic>();
    public ICollection<EmployeeResponsibility> Responsibilities { get; set; } = new List<EmployeeResponsibility>();
}
