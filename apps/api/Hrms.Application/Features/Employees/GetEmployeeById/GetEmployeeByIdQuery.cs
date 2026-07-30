using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Employees.Common;
using Hrms.Application.Features.Employees.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Employees.GetEmployeeById;

public record GetEmployeeByIdQuery(Guid Id) : IRequest<EmployeeDetailDto>;

public class GetEmployeeByIdHandler(IApplicationDbContext db, IScopeGuard scope, ICurrentUser currentUser, IPermissionService permService)
    : IRequestHandler<GetEmployeeByIdQuery, EmployeeDetailDto>
{
    public async Task<EmployeeDetailDto> Handle(GetEmployeeByIdQuery request, CancellationToken ct)
    {
        var employee = await db.Employees
            .Include(e => e.Department)
            .Include(e => e.Roles).ThenInclude(r => r.Role)
            .Include(e => e.RoleLabel)
            .FirstOrDefaultAsync(e => e.Id == request.Id, ct)
            ?? throw new KeyNotFoundException("ไม่พบข้อมูลพนักงาน");

        await scope.ThrowIfCannotAccessAsync(employee.CompanyId);

        // คนที่มี employee:view จึงเห็น NationalId จริง; อื่นเห็นแค่ masked
        var includeRealNationalId = await permService.HasPermissionAsync(currentUser, "employee:view", ct);

        return employee.ToDetailDto(employee.Department?.Name, includeRealNationalId);
    }
}
