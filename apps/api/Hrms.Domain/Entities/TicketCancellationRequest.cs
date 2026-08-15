using Hrms.Domain.Common;
using Hrms.Domain.Enums;

namespace Hrms.Domain.Entities;

public class TicketCancellationRequest : BaseEntity
{
    public Guid TicketId { get; set; }
    public Guid? RequestedByEmployeeId { get; set; }
    public Guid? RequestedByExternalReporterId { get; set; }
    public string Reason { get; set; } = string.Empty;
    public TicketCancellationStatus Status { get; set; } = TicketCancellationStatus.Pending;
    public string? PendingSlot { get; set; } = "Pending";
    public DateTime RequestedAt { get; set; }
    public Guid? ReviewedByEmployeeId { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewNote { get; set; }

    public Ticket Ticket { get; set; } = null!;
    public Employee? RequestedByEmployee { get; set; }
    public ExternalReporter? RequestedByExternalReporter { get; set; }
    public Employee? ReviewedByEmployee { get; set; }
}
