using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Tickets.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Tickets.Queries;

public record GetTicketLookupCompaniesQuery : IRequest<IReadOnlyList<TicketLookupCompanyDto>>;

public class GetTicketLookupCompaniesHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<GetTicketLookupCompaniesQuery, IReadOnlyList<TicketLookupCompanyDto>>
{
    public async Task<IReadOnlyList<TicketLookupCompanyDto>> Handle(GetTicketLookupCompaniesQuery request, CancellationToken ct)
    {
        var employeeId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

        var isActive = await db.Employees.AnyAsync(e => e.Id == employeeId && e.IsActive, ct);
        if (!isActive) throw new AppUnauthorizedException("EMPLOYEE_NOT_FOUND");

        return await db.Companies
            .Where(c => c.IsActive)
            .OrderBy(c => c.Name)
            .Select(c => new TicketLookupCompanyDto(c.Id, c.Name))
            .ToListAsync(ct);
    }
}
