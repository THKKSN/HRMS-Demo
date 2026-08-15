namespace Hrms.Application.Features.Tickets.Dtos;

public record TicketSubjectDto(
    Guid Id,
    Guid CompanyId,
    Guid DepartmentId,
    Guid CategoryId,
    Guid TopicId,
    string Name,
    string? Description,
    int SortOrder,
    bool IsActive);
