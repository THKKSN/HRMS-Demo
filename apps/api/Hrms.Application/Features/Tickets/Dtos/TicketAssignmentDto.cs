using Hrms.Domain.Enums;

namespace Hrms.Application.Features.Tickets.Dtos;

public record TicketAssignmentDto(
    Guid Id,
    Guid TicketId,
    Guid AssignedToEmployeeId,
    string AssignedToEmployeeName,
    Guid? AssignedByEmployeeId,
    string? AssignedByEmployeeName,
    DateTime AssignedAt,
    bool IsPrimary,
    bool IsActive,
    DateTime? EndedAt,
    Guid? EndedByEmployeeId,
    string? EndedByEmployeeName,
    string? Note,
    TicketAssignmentSource AssignmentSource,
    Guid? ResponsibilityId,
    TicketRoutingLevel RoutingLevelSnapshot);
