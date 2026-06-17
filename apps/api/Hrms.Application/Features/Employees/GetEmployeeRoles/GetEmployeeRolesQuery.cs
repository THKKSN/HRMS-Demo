using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Employees.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Employees.GetEmployeeRoles;

public record GetEmployeeRolesQuery(Guid EmployeeId) : IRequest<IReadOnlyList<EmployeeRoleDto>>;

public class GetEmployeeRolesHandler(IApplicationDbContext db, IScopeGuard scope)
    : IRequestHandler<GetEmployeeRolesQuery, IReadOnlyList<EmployeeRoleDto>>
{
    public async Task<IReadOnlyList<EmployeeRoleDto>> Handle(GetEmployeeRolesQuery request, CancellationToken ct)
    {
        var employee = await db.Employees
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == request.EmployeeId, ct)
            ?? throw new KeyNotFoundException("ไม่พบข้อมูลพนักงาน");

        scope.ThrowIfCannotAccess(employee.CompanyId);

        return await db.EmployeeRoles
            .AsNoTracking()
            .Where(r => r.EmployeeId == request.EmployeeId)
            .Select(r => new EmployeeRoleDto(r.Id, r.Role, r.CompanyId ?? employee.CompanyId, r.DepartmentId, r.IsActive))
            .ToListAsync(ct);
    }
}
