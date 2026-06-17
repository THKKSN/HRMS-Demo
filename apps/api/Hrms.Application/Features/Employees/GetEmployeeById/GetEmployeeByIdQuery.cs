using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Employees.Common;
using Hrms.Application.Features.Employees.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Employees.GetEmployeeById;

public record GetEmployeeByIdQuery(Guid Id) : IRequest<EmployeeDetailDto>;

public class GetEmployeeByIdHandler(IApplicationDbContext db, IScopeGuard scope)
    : IRequestHandler<GetEmployeeByIdQuery, EmployeeDetailDto>
{
    public async Task<EmployeeDetailDto> Handle(GetEmployeeByIdQuery request, CancellationToken ct)
    {
        var employee = await db.Employees
            .Include(e => e.Department)
            .Include(e => e.Roles)
            .FirstOrDefaultAsync(e => e.Id == request.Id, ct)
            ?? throw new KeyNotFoundException("ไม่พบข้อมูลพนักงาน");

        scope.ThrowIfCannotAccess(employee.CompanyId);

        return employee.ToDetailDto(employee.Department?.Name);
    }
}
