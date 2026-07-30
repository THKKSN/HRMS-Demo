using Hrms.Domain.Enums;

namespace Hrms.Application.Features.Tickets.Dtos;

public record AssignedTicketItemDto(
    Guid Id,
    string TicketNo,
    string Title,
    TicketStatus Status,
    TicketPriority Priority,
    string RequesterName,
    string CategoryName,
    string TopicName,
    string? VehicleText,
    string? LocationText,
    DateTime AssignedAt,
    DateTime? WorkStartedAt,
    DateTime UpdatedAt);
