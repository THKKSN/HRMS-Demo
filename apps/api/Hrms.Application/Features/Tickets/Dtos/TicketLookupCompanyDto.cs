namespace Hrms.Application.Features.Tickets.Dtos;

public record TicketLookupCompanyDto(Guid Id, string Name, string? NameEn = null, string? NameId = null);
