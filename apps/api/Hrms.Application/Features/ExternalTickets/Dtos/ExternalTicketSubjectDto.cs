namespace Hrms.Application.Features.ExternalTickets.Dtos;

public record ExternalTicketSubjectDto(
    Guid Id,
    Guid ExternalTicketTopicId,
    string Name,
    string? Description,
    string? Template,
    IReadOnlyList<string> Suggestions,
    int SortOrder,
    bool IsActive);
