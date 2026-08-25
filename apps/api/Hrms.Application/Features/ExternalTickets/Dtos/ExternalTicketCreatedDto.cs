using Hrms.Domain.Enums;

namespace Hrms.Application.Features.ExternalTickets.Dtos;

public record ExternalTicketCreatedDto(
    Guid Id,
    string TicketNo,
    string CategoryName,
    string TopicName,
    string SubjectName,
    string Title,
    TicketStatus Status,
    DateTime CreatedAt);
