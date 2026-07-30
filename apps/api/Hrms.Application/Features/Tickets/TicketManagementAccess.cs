using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Tickets;

internal static class TicketManagementAccess
{
    public static async Task<Department> EnsureDepartmentAsync(
        IApplicationDbContext db,
        ICurrentUser currentUser,
        IPermissionService permissionService,
        string permission,
        Guid companyId,
        Guid departmentId,
        CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permissionService, permission, ct);

        var department = await db.Departments
            .FirstOrDefaultAsync(d => d.Id == departmentId && d.CompanyId == companyId, ct)
            ?? throw new KeyNotFoundException("ไม่พบแผนกที่ระบุ");

        var canManage = currentUser.CanManageDepartment(companyId, departmentId, department.ManagerEmployeeId);
        if (!canManage && currentUser.HasRole(RoleType.Supervisor, companyId) && currentUser.EmployeeId.HasValue)
        {
            canManage = await db.Employees.AnyAsync(employee =>
                employee.Id == currentUser.EmployeeId.Value && employee.IsActive &&
                employee.CompanyId == companyId && employee.DepartmentId == departmentId, ct);
        }
        if (!canManage)
            throw new AppForbiddenException("Supervisor จัดการหมวดและหัวข้อได้เฉพาะแผนกที่ตัวเองสังกัดหรือดูแล");

        return department;
    }
}
