using Hrms.Domain.Enums;

namespace Hrms.Application.Features.Tickets.Dtos;

public sealed record TicketRequesterDto(
    TicketRequestType Type,
    Guid? EmployeeId,
    Guid? ExternalReporterId,
    string Name,
    string? Phone,
    string? Email,
    string? Organization);
