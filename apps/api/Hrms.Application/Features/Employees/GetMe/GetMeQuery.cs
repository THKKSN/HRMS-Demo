using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.Employees.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Employees.GetMe;

public record GetMeQuery : IRequest<EmployeeProfileDto>;

public class GetMeHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<GetMeQuery, EmployeeProfileDto>
{
    public async Task<EmployeeProfileDto> Handle(GetMeQuery request, CancellationToken ct)
    {
        var employeeId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("Not authenticated.");

        var employee = await db.Employees
            .Include(e => e.Roles.Where(r => r.IsActive))
            .Include(e => e.Company)
            .Include(e => e.Department)
            .Include(e => e.RoleLabel)
            .FirstOrDefaultAsync(e => e.Id == employeeId && e.IsActive, ct)
            ?? throw new AppUnauthorizedException("Employee not found.");

        var roles = employee.Roles
            .Select(r => new RoleClaim(r.Role.ToString(), r.CompanyId, r.DepartmentId))
            .ToList();

        return new EmployeeProfileDto(
            employee.Id,
            employee.EmployeeCode,
            $"{employee.FirstName} {employee.LastName}".Trim(),
            employee.Email,
            employee.Phone,
            employee.AvatarUrl,
            employee.CompanyId,
            employee.Company?.Name,
            employee.DepartmentId,
            employee.Department?.Name,
            employee.RoleLabel?.Name,
            employee.HireDate,
            roles);
    }
}
