namespace Hrms.Application.Features.Tickets.Dtos;

public record TicketAuditEventDto(
    Guid Id,
    string Action,
    string Description,
    string? OldValues,
    string? NewValues,
    Guid? PerformedByEmployeeId,
    string? PerformedByName,
    DateTime CreatedAt);
