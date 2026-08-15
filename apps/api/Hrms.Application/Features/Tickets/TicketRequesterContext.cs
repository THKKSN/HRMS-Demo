using Hrms.Application.Features.Tickets.Dtos;
using Hrms.Domain.Enums;

namespace Hrms.Application.Features.Tickets;

public sealed record TicketRequesterContext(
    TicketRequestType RequestType,
    Guid? EmployeeId,
    Guid? ExternalReporterId,
    string DisplayName,
    string? LineUserId,
    string? Phone,
    string? Email,
    string? Organization)
{
    public TicketRequesterDto ToDto(bool includeContact = false) => new(
        RequestType,
        EmployeeId,
        ExternalReporterId,
        DisplayName,
        includeContact ? Phone : null,
        includeContact ? Email : null,
        Organization);
}
