using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Employees.RemoveEmployeeRole;

public record RemoveEmployeeRoleCommand(Guid EmployeeId, Guid RoleId) : IRequest;

public class RemoveEmployeeRoleHandler(IApplicationDbContext db, IScopeGuard scope)
    : IRequestHandler<RemoveEmployeeRoleCommand>
{
    public async Task Handle(RemoveEmployeeRoleCommand request, CancellationToken ct)
    {
        var employee = await db.Employees
            .FirstOrDefaultAsync(e => e.Id == request.EmployeeId, ct)
            ?? throw new KeyNotFoundException("ไม่พบข้อมูลพนักงาน");

        scope.ThrowIfCannotAccess(employee.CompanyId);

        var role = await db.EmployeeRoles
            .FirstOrDefaultAsync(r => r.Id == request.RoleId && r.EmployeeId == request.EmployeeId, ct)
            ?? throw new KeyNotFoundException("ไม่พบข้อมูล role");

        // ป้องกันลบ Admin คนสุดท้าย
        if (role.Role == RoleType.Admin)
        {
            var activeAdminCount = await db.EmployeeRoles
                .CountAsync(r => r.Role == RoleType.Admin && r.CompanyId == employee.CompanyId && r.IsActive, ct);

            if (activeAdminCount <= 1)
                throw new ConflictException("LAST_ADMIN", "ไม่สามารถลบ Admin คนสุดท้ายของบริษัทได้");
        }

        db.EmployeeRoles.Remove(role);
        await db.SaveChangesAsync(ct);
    }
}
