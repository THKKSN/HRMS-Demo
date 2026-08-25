using Hrms.Domain.Common;
using Hrms.Domain.Enums;

namespace Hrms.Domain.Entities;

public class ExternalRepairSyncOutbox : BaseEntity
{
    public Guid TicketId { get; set; }
    public string PayloadJson { get; set; } = string.Empty;
    public string DeduplicationKey { get; set; } = string.Empty;
    public NotificationDeliveryStatus Status { get; set; } = NotificationDeliveryStatus.Pending;
    public int AttemptCount { get; set; }
    public DateTime? NextAttemptAt { get; set; }
    public DateTime? ProcessingStartedAt { get; set; }
    public string? LastError { get; set; }
    public DateTime? SentAt { get; set; }

    public Ticket Ticket { get; set; } = null!;
}
