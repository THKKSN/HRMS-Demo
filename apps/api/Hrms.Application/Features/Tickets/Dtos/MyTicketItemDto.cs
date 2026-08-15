using Hrms.Domain.Enums;

namespace Hrms.Application.Features.Tickets.Dtos;

public record MyTicketItemDto(
    Guid Id,
    string TicketNo,
    string Title,
    TicketStatus Status,
    TicketPriority Priority,
    TicketRequesterDto Requester,
    string TargetCompanyName,
    string TargetDepartmentName,
    string CategoryName,
    string TopicName,
    string? OtherTopicText,
    string? CurrentAssigneeName,
    bool HasPendingCancellation,
    DateTime CreatedAt,
    DateTime UpdatedAt);
