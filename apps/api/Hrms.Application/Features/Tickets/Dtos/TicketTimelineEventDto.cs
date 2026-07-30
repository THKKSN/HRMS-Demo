namespace Hrms.Application.Features.Tickets.Dtos;

public record TicketTimelineEventDto(
    string Id,
    string EventType,
    string Action,
    string Description,
    Guid? EmployeeId,
    string? EmployeeName,
    bool IsInternal,
    DateTime CreatedAt);
