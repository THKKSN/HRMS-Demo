using Hrms.Domain.Common;
using Hrms.Domain.Enums;

namespace Hrms.Domain.Entities;

public class TicketAssignment : BaseEntity
{
    public Guid TicketId { get; set; }
    public Guid AssignedToEmployeeId { get; set; }
    public Guid? AssignedByEmployeeId { get; set; }
    public DateTime AssignedAt { get; set; }
    public bool IsPrimary { get; set; } = true;
    public bool IsActive { get; set; } = true;
    public string? ActiveSlot { get; set; } = "Primary";
    public DateTime? EndedAt { get; set; }
    public Guid? EndedByEmployeeId { get; set; }
    public string? Note { get; set; }
    public TicketAssignmentSource AssignmentSource { get; set; } = TicketAssignmentSource.Manual;
    public Guid? ResponsibilityId { get; set; }
    public TicketRoutingLevel RoutingLevelSnapshot { get; set; } = TicketRoutingLevel.None;

    public Ticket Ticket { get; set; } = null!;
    public Employee AssignedToEmployee { get; set; } = null!;
    public Employee? AssignedByEmployee { get; set; }
    public Employee? EndedByEmployee { get; set; }
    public EmployeeResponsibility? Responsibility { get; set; }
}
