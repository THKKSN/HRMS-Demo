using Hrms.Domain.Common;
using Hrms.Domain.Enums;

namespace Hrms.Domain.Entities;

public class NotificationOutbox : BaseEntity
{
    public NotificationChannel Channel { get; set; } = NotificationChannel.Line;
    public Guid? RecipientEmployeeId { get; set; }
    public Employee? RecipientEmployee { get; set; }
    public string LineUserId { get; set; } = string.Empty;
    public string EventType { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public Guid EntityId { get; set; }
    public string? EntityReference { get; set; }
    public string PayloadJson { get; set; } = string.Empty;
    public string DeduplicationKey { get; set; } = string.Empty;
    public NotificationDeliveryStatus Status { get; set; } = NotificationDeliveryStatus.Pending;
    public int AttemptCount { get; set; }
    public DateTime? NextAttemptAt { get; set; }
    public DateTime? ProcessingStartedAt { get; set; }
    public string? LastError { get; set; }
    public DateTime? SentAt { get; set; }
}
