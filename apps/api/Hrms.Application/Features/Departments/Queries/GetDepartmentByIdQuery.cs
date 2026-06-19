using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Departments.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Departments.Queries;

public record GetDepartmentByIdQuery(Guid Id) : IRequest<DepartmentDto>;

public class GetDepartmentByIdHandler(IApplicationDbContext db)
    : IRequestHandler<GetDepartmentByIdQuery, DepartmentDto>
{
    public async Task<DepartmentDto> Handle(GetDepartmentByIdQuery request, CancellationToken ct)
    {
        var dept = await db.Departments
            .Include(d => d.ManagerEmployee)
            .FirstOrDefaultAsync(d => d.Id == request.Id, ct)
            ?? throw new KeyNotFoundException("ไม่พบข้อมูลแผนก");

        return new DepartmentDto(
            dept.Id,
            dept.CompanyId,
            dept.Name,
            dept.DeptType,
            dept.ManagerEmployeeId,
            dept.ManagerEmployee is null ? null : $"{dept.ManagerEmployee.FirstName} {dept.ManagerEmployee.LastName}".Trim(),
            dept.IsActive);
    }
}
