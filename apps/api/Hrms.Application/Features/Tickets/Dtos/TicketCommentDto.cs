using Hrms.Domain.Enums;

namespace Hrms.Application.Features.Tickets.Dtos;

public record TicketCommentDto(
    Guid Id,
    Guid TicketId,
    Guid EmployeeId,
    string EmployeeName,
    TicketCommentType CommentType,
    string Message,
    bool IsInternal,
    DateTime CreatedAt);
