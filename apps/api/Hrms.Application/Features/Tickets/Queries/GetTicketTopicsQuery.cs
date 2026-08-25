using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Tickets.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Tickets.Queries;

public record GetTicketTopicsQuery(Guid? CompanyId, Guid? DepartmentId, Guid? CategoryId) : IRequest<IReadOnlyList<TicketTopicDto>>;

public class GetTicketTopicsHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<GetTicketTopicsQuery, IReadOnlyList<TicketTopicDto>>
{
    public async Task<IReadOnlyList<TicketTopicDto>> Handle(GetTicketTopicsQuery request, CancellationToken ct)
    {
        var employeeId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

        var isActive = await db.Employees.AnyAsync(e => e.Id == employeeId && e.IsActive, ct);
        if (!isActive) throw new AppUnauthorizedException("EMPLOYEE_NOT_FOUND");

        var query = db.TicketTopics.Where(t => t.IsActive);
        if (request.CompanyId.HasValue) query = query.Where(t => t.CompanyId == request.CompanyId.Value);
        if (request.DepartmentId.HasValue) query = query.Where(t => t.DepartmentId == request.DepartmentId.Value);
        if (request.CategoryId.HasValue) query = query.Where(t => t.CategoryId == request.CategoryId.Value);

        return await query
            .OrderBy(t => t.SortOrder)
            .ThenBy(t => t.Name)
            .Select(t => new TicketTopicDto(t.Id, t.CompanyId, t.DepartmentId, t.CategoryId, t.Name, t.Description, t.SortOrder, t.IsActive, t.RoutingMode, t.SyncToExternalRepairSystem))
            .ToListAsync(ct);
    }
}
