using Hrms.Domain.Enums;

namespace Hrms.Application.Features.NotificationDeliveries.Dtos;

public record NotificationDeliveryDto(
    Guid Id,
    NotificationChannel Channel,
    string EventType,
    string EntityType,
    Guid EntityId,
    string? EntityReference,
    Guid? RecipientEmployeeId,
    string RecipientName,
    NotificationDeliveryStatus Status,
    int AttemptCount,
    DateTime? NextAttemptAt,
    string? LastError,
    DateTime? SentAt,
    DateTime CreatedAt);
