using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Tickets.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Tickets.Queries;

public record GetTicketSubjectsQuery(Guid? CompanyId, Guid? DepartmentId, Guid? CategoryId, Guid? TopicId)
    : IRequest<IReadOnlyList<TicketSubjectDto>>;

public class GetTicketSubjectsHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<GetTicketSubjectsQuery, IReadOnlyList<TicketSubjectDto>>
{
    public async Task<IReadOnlyList<TicketSubjectDto>> Handle(GetTicketSubjectsQuery request, CancellationToken ct)
    {
        var employeeId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

        var isActive = await db.Employees.AnyAsync(e => e.Id == employeeId && e.IsActive, ct);
        if (!isActive) throw new AppUnauthorizedException("EMPLOYEE_NOT_FOUND");

        var query = db.TicketSubjects.Where(s => s.IsActive);
        if (request.CompanyId.HasValue) query = query.Where(s => s.CompanyId == request.CompanyId.Value);
        if (request.DepartmentId.HasValue) query = query.Where(s => s.DepartmentId == request.DepartmentId.Value);
        if (request.CategoryId.HasValue) query = query.Where(s => s.CategoryId == request.CategoryId.Value);
        if (request.TopicId.HasValue) query = query.Where(s => s.TopicId == request.TopicId.Value);

        return await query
            .OrderBy(s => s.SortOrder)
            .ThenBy(s => s.Name)
            .Select(s => new TicketSubjectDto(
                s.Id, s.CompanyId, s.DepartmentId, s.CategoryId, s.TopicId,
                s.Name, s.Description, s.SortOrder, s.IsActive))
            .ToListAsync(ct);
    }
}
