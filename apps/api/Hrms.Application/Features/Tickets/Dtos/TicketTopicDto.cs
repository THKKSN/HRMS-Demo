using Hrms.Domain.Enums;

namespace Hrms.Application.Features.Tickets.Dtos;

public record TicketTopicDto(
    Guid Id,
    Guid CompanyId,
    Guid DepartmentId,
    Guid CategoryId,
    string Name,
    string? Description,
    int SortOrder,
    bool IsActive,
    TicketRoutingMode RoutingMode);
