using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public class EmployeeResponsibility : BaseEntity
{
    public Guid CompanyId { get; set; }
    public Guid DepartmentId { get; set; }
    public Guid CategoryId { get; set; }
    public Guid? TopicId { get; set; }
    public Guid EmployeeId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateOnly? EffectiveFrom { get; set; }
    public DateOnly? EffectiveTo { get; set; }
    public string? Note { get; set; }
    public Guid CreatedByEmployeeId { get; set; }

    public Company Company { get; set; } = null!;
    public Department Department { get; set; } = null!;
    public TicketCategory Category { get; set; } = null!;
    public TicketTopic? Topic { get; set; }
    public Employee Employee { get; set; } = null!;
    public Employee CreatedByEmployee { get; set; } = null!;
    public ICollection<TicketAssignment> Assignments { get; set; } = new List<TicketAssignment>();
}
