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
            ?? throw new NotFoundException("Employee", request.EmployeeId, "EMPLOYEE_NOT_FOUND");

        await scope.ThrowIfCannotAccessAsync(employee.CompanyId);

        var role = await db.EmployeeRoles
            .FirstOrDefaultAsync(r => r.Id == request.RoleId && r.EmployeeId == request.EmployeeId, ct)
            ?? throw new NotFoundException("SystemRole", request.RoleId, "ROLE_NOT_FOUND");

        // ป้องกันถอด Admin คนสุดท้าย — Admin เป็นสิทธิ์ระดับทั้งระบบ (ไม่ได้ scope ตามบริษัท)
        // จึงต้องเหลือพนักงาน active อีกอย่างน้อย 1 คนที่ถือ Admin อยู่ ไม่ใช่นับแค่ในบริษัทเดียวกัน
        if (role.RoleId == SystemRoleIds.Admin)
        {
            var otherActiveAdminExists = await db.EmployeeRoles
                .AnyAsync(r => r.RoleId == SystemRoleIds.Admin && r.IsActive &&
                    r.EmployeeId != request.EmployeeId && r.Employee.IsActive, ct);

            if (!otherActiveAdminExists)
                throw new ConflictException("LAST_ADMIN", "The last Admin of the system cannot be removed.");
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
