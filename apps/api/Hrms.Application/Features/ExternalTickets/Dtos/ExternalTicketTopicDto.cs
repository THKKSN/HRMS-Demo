namespace Hrms.Application.Features.ExternalTickets.Dtos;

public record ExternalTicketTopicDto(
    Guid Id,
    Guid ExternalTicketCategoryId,
    string Name,
    string? Description,
    int SortOrder,
    bool IsActive);
