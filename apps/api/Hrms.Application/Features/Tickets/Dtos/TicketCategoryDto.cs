using Hrms.Domain.Enums;

namespace Hrms.Application.Features.Tickets.Dtos;

public record TicketCategoryDto(
    Guid Id,
    Guid CompanyId,
    Guid DepartmentId,
    string Name,
    string? Description,
    int SortOrder,
    bool IsActive,
    bool EnableResponsibilityFallback,
    TicketRoutingMode RoutingMode);
