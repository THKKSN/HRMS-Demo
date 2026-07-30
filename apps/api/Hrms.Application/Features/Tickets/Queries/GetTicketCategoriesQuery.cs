using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Tickets.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Tickets.Queries;

public record GetTicketCategoriesQuery(Guid? CompanyId, Guid? DepartmentId) : IRequest<IReadOnlyList<TicketCategoryDto>>;

public class GetTicketCategoriesHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<GetTicketCategoriesQuery, IReadOnlyList<TicketCategoryDto>>
{
    public async Task<IReadOnlyList<TicketCategoryDto>> Handle(GetTicketCategoriesQuery request, CancellationToken ct)
    {
        var employeeId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

        var isActive = await db.Employees.AnyAsync(e => e.Id == employeeId && e.IsActive, ct);
        if (!isActive) throw new AppUnauthorizedException("EMPLOYEE_NOT_FOUND");

        var query = db.TicketCategories.Where(c => c.IsActive);
        if (request.CompanyId.HasValue) query = query.Where(c => c.CompanyId == request.CompanyId.Value);
        if (request.DepartmentId.HasValue) query = query.Where(c => c.DepartmentId == request.DepartmentId.Value);

        return await query
            .OrderBy(c => c.SortOrder)
            .ThenBy(c => c.Name)
            .Select(c => new TicketCategoryDto(c.Id, c.CompanyId, c.DepartmentId, c.Name, c.Description, c.SortOrder, c.IsActive, c.EnableResponsibilityFallback, c.RoutingMode))
            .ToListAsync(ct);
    }
}
