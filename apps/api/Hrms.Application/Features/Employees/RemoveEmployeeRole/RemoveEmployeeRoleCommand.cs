using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Constants;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Employees.RemoveEmployeeRole;

public record RemoveEmployeeRoleCommand(Guid EmployeeId, Guid RoleId) : IRequest;

public class RemoveEmployeeRoleHandler(
    IApplicationDbContext db,
    IScopeGuard scope,
    ICurrentUser currentUser,
    IPermissionService permService,
    IAuditLogService auditLog)
    : IRequestHandler<RemoveEmployeeRoleCommand>
{
    public async Task Handle(RemoveEmployeeRoleCommand request, CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permService, "employee:assign-role", ct);

        var employee = await db.Employees
            .FirstOrDefaultAsync(e => e.Id == request.EmployeeId, ct)
            ?? throw new KeyNotFoundException("ไม่พบข้อมูลพนักงาน");

        await scope.ThrowIfCannotAccessAsync(employee.CompanyId);

        var role = await db.EmployeeRoles
            .FirstOrDefaultAsync(r => r.Id == request.RoleId && r.EmployeeId == request.EmployeeId, ct)
            ?? throw new KeyNotFoundException("ไม่พบข้อมูล role");

        // ป้องกันลบ Admin คนสุดท้าย
        if (role.RoleId == SystemRoleIds.Admin)
        {
            var activeAdminCount = await db.EmployeeRoles
                .CountAsync(r => r.RoleId == SystemRoleIds.Admin && r.CompanyId == employee.CompanyId && r.IsActive, ct);

            if (activeAdminCount <= 1)
                throw new ConflictException("LAST_ADMIN", "ไม่สามารถลบ Admin คนสุดท้ายของบริษัทได้");
        }

        role.IsActive  = false;
        role.UpdatedAt = DateTime.UtcNow.AddHours(7);
        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module:      "employee",
            entityType:  "EmployeeRole",
            entityId:    employee.Id.ToString(),
            action:      "remove-role",
            description: $"ถอดสิทธิ์ {SystemRoleIds.ToCode(role.RoleId)} ออกจากพนักงาน {employee.FirstName} {employee.LastName}",
            oldValues:   new { role.RoleId, role = SystemRoleIds.ToCode(role.RoleId), role.CompanyId, role.DepartmentId },
            newValues:   new { isActive = false },
            ct:          ct);
    }
}
