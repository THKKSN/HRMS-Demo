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
    string? Organization,
    string? Nickname = null)
{
    public TicketRequesterDto ToDto(bool includeContact = false) => new(
        RequestType,
        EmployeeId,
        ExternalReporterId,
        DisplayName,
        Nickname,
        includeContact ? Phone : null,
        includeContact ? Email : null,
        Organization);
}
