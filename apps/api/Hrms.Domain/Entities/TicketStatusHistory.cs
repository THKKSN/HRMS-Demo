using Hrms.Domain.Common;
using Hrms.Domain.Enums;

namespace Hrms.Domain.Entities;

public class TicketStatusHistory : BaseEntity
{
    public Guid TicketId { get; set; }
    public TicketStatus? FromStatus { get; set; }
    public TicketStatus ToStatus { get; set; }
    public Guid? ChangedByEmployeeId { get; set; }
    public Guid? ChangedByExternalReporterId { get; set; }
    public DateTime ChangedAt { get; set; }
    public string? Reason { get; set; }
    public Guid? AssignmentId { get; set; }

    public Ticket Ticket { get; set; } = null!;
    public Employee? ChangedByEmployee { get; set; }
    public ExternalReporter? ChangedByExternalReporter { get; set; }
    public TicketAssignment? Assignment { get; set; }
}
