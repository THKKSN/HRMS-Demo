namespace Hrms.Application.Features.AuditLogs.Dtos;

public record AuditLogDto(
    Guid Id,
    string Module,
    string EntityType,
    string EntityId,
    string Action,
    string Description,
    string? OldValues,
    string? NewValues,
    Guid? PerformedByEmployeeId,
    string? PerformedByName,
    DateTime PerformedAt);
