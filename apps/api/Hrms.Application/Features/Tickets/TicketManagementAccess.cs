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
            ?? throw new NotFoundException("Department", departmentId, "DEPARTMENT_NOT_FOUND");

        var canManage = currentUser.CanManageDepartment(companyId, departmentId, department.ManagerEmployeeId);
        if (!canManage && currentUser.HasRole(RoleType.Supervisor, companyId) && currentUser.EmployeeId.HasValue)
        {
            canManage = await db.Employees.AnyAsync(employee =>
                employee.Id == currentUser.EmployeeId.Value && employee.IsActive &&
                employee.CompanyId == companyId && employee.DepartmentId == departmentId, ct);
        }
        if (!canManage)
            throw new AppForbiddenException("TICKET_TAXONOMY_DEPARTMENT_FORBIDDEN", "A supervisor can manage categories and topics only for their own or managed department.");

        return department;
    }

    /// <summary>
    /// สิทธิ์จัดการรายการระดับบริษัท (ไม่ผูกแผนก) เช่น เหตุผลปิดงานที่ใช้ได้ทั้งบริษัท
    /// Admin ทำได้ทุกบริษัท ส่วน Supervisor ทำได้เฉพาะบริษัทที่ตัวเองสังกัดและมี role Supervisor อยู่
    /// </summary>
    public static async Task EnsureCompanyAsync(
        IApplicationDbContext db,
        ICurrentUser currentUser,
        IPermissionService permissionService,
        string permission,
        Guid companyId,
        CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permissionService, permission, ct);

        if (!await db.Companies.AnyAsync(c => c.Id == companyId, ct))
            throw new NotFoundException("Company", companyId, "COMPANY_NOT_FOUND");
        if (currentUser.HasRole(RoleType.Admin)) return;
        if (currentUser.HasRole(RoleType.Supervisor, companyId) && currentUser.CompanyId == companyId) return;
        throw new AppForbiddenException("TICKET_TAXONOMY_COMPANY_FORBIDDEN", "Only an admin or a supervisor of this company can manage company-wide items.");
    }
}
