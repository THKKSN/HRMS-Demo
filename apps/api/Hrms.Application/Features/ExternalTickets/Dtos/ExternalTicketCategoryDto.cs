namespace Hrms.Application.Features.ExternalTickets.Dtos;

public record ExternalTicketCategoryDto(
    Guid Id,
    string Name,
    string? Description,
    int SortOrder,
    bool IsActive);
