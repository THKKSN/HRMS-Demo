using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Employees.Common;
using Hrms.Application.Features.Employees.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Employees.GetEmployeeById;

public record GetEmployeeByIdQuery(Guid Id) : IRequest<EmployeeDetailDto>;

public class GetEmployeeByIdHandler(IApplicationDbContext db, IScopeGuard scope, ICurrentUser currentUser)
    : IRequestHandler<GetEmployeeByIdQuery, EmployeeDetailDto>
{
    public async Task<EmployeeDetailDto> Handle(GetEmployeeByIdQuery request, CancellationToken ct)
    {
        var employee = await db.Employees
            .Include(e => e.Department)
            .Include(e => e.Roles)
            .Include(e => e.RoleLabel)
            .FirstOrDefaultAsync(e => e.Id == request.Id, ct)
            ?? throw new KeyNotFoundException("ไม่พบข้อมูลพนักงาน");

        await scope.ThrowIfCannotAccessAsync(employee.CompanyId);

        // Admin/HR เห็น national ID จริง; Supervisor/อื่นเห็นแค่ masked
        var includeRealNationalId = currentUser.IsAdminOrHr();

        return employee.ToDetailDto(employee.Department?.Name, includeRealNationalId);
    }
}
