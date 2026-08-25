using Hrms.Domain.Common;
using Hrms.Domain.Enums;

namespace Hrms.Domain.Entities;

public class TicketTopic : BaseEntity
{
    public Guid CompanyId { get; set; }
    public Guid DepartmentId { get; set; }
    public Guid CategoryId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
    public Guid? CreatedByEmployeeId { get; set; }
    public TicketRoutingMode RoutingMode { get; set; } = TicketRoutingMode.SupervisorAssign;
    public bool SyncToExternalRepairSystem { get; set; }

    public Company Company { get; set; } = null!;
    public Department Department { get; set; } = null!;
    public TicketCategory Category { get; set; } = null!;
    public Employee? CreatedByEmployee { get; set; }
    public ICollection<Ticket> Tickets { get; set; } = new List<Ticket>();
    public ICollection<TicketSubject> Subjects { get; set; } = new List<TicketSubject>();
    public ICollection<EmployeeResponsibility> Responsibilities { get; set; } = new List<EmployeeResponsibility>();
}
