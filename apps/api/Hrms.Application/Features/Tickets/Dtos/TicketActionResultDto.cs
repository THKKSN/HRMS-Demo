using Hrms.Domain.Enums;

namespace Hrms.Application.Features.Tickets.Dtos;

public record TicketActionResultDto(
    Guid TicketId,
    TicketStatus Status,
    DateTime UpdatedAt);
