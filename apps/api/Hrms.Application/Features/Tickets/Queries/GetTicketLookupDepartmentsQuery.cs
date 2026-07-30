using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Tickets.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Tickets.Queries;

public record GetTicketLookupDepartmentsQuery(Guid? CompanyId) : IRequest<IReadOnlyList<TicketLookupDepartmentDto>>;

public class GetTicketLookupDepartmentsHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<GetTicketLookupDepartmentsQuery, IReadOnlyList<TicketLookupDepartmentDto>>
{
    public async Task<IReadOnlyList<TicketLookupDepartmentDto>> Handle(GetTicketLookupDepartmentsQuery request, CancellationToken ct)
    {
        var employeeId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

        var isActive = await db.Employees.AnyAsync(e => e.Id == employeeId && e.IsActive, ct);
        if (!isActive) throw new AppUnauthorizedException("EMPLOYEE_NOT_FOUND");

        var query = db.Departments.Where(d => d.IsActive);
        if (request.CompanyId.HasValue)
            query = query.Where(d => d.CompanyId == request.CompanyId.Value);

        return await query
            .OrderBy(d => d.Name)
            .Select(d => new TicketLookupDepartmentDto(d.Id, d.CompanyId, d.Name))
            .ToListAsync(ct);
    }
}
