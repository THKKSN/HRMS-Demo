using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Departments.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Departments.Queries;

public record GetDepartmentsQuery(
    Guid? CompanyId,
    bool IncludeInactive = false) : IRequest<IReadOnlyList<DepartmentListItemDto>>;

public class GetDepartmentsHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<GetDepartmentsQuery, IReadOnlyList<DepartmentListItemDto>>
{
    public async Task<IReadOnlyList<DepartmentListItemDto>> Handle(GetDepartmentsQuery request, CancellationToken ct)
    {
        if (!currentUser.IsAdminOrHr())
            throw new AppForbiddenException("เฉพาะ HR / Admin เท่านั้นที่เข้าถึงได้");

        var query = db.Departments
            .Include(d => d.ManagerEmployee)
            .Where(d => !request.IncludeInactive ? d.IsActive : true);

        if (currentUser.HasRole(RoleType.Admin))
        {
            if (request.CompanyId.HasValue)
                query = query.Where(d => d.CompanyId == request.CompanyId.Value);
        }
        else
        {
            var managed = currentUser.ManagedCompanyIds.ToList();
            query = request.CompanyId.HasValue && managed.Contains(request.CompanyId.Value)
                ? query.Where(d => d.CompanyId == request.CompanyId.Value)
                : query.Where(d => managed.Contains(d.CompanyId));
        }

        var departments = await query
            .OrderBy(d => d.Name)
            .ToListAsync(ct);

        var deptIds = departments.Select(d => d.Id).ToList();

        var countByDept = await db.Employees
            .Where(e => e.DepartmentId.HasValue && deptIds.Contains(e.DepartmentId.Value) && e.IsActive)
            .GroupBy(e => e.DepartmentId!.Value)
            .Select(g => new { DeptId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.DeptId, x => x.Count, ct);

        return departments.Select(d => new DepartmentListItemDto(
            d.Id,
            d.CompanyId,
            d.Name,
            d.DeptType,
            d.ManagerEmployeeId,
            d.ManagerEmployee is null ? null : $"{d.ManagerEmployee.FirstName} {d.ManagerEmployee.LastName}".Trim(),
            countByDept.GetValueOrDefault(d.Id, 0),
            d.IsActive)).ToList();
    }
}
