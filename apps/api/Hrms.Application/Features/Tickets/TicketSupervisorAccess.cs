using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Tickets;

internal static class TicketSupervisorAccess
{
    public static async Task EnsureDepartmentAsync(
        IApplicationDbContext db,
        ICurrentUser currentUser,
        IPermissionService permissionService,
        string permission,
        Guid companyId,
        Guid departmentId,
        CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permissionService, permission, ct);

        var department = await db.Departments.AsNoTracking().FirstOrDefaultAsync(d =>
            d.Id == departmentId && d.CompanyId == companyId && d.IsActive, ct)
            ?? throw new KeyNotFoundException("ไม่พบแผนกที่ระบุ");

        var canManage = currentUser.CanManageDepartment(companyId, departmentId, department.ManagerEmployeeId);
        if (!canManage && currentUser.HasRole(RoleType.Supervisor, companyId) && currentUser.EmployeeId.HasValue)
        {
            canManage = await db.Employees.AnyAsync(employee =>
                employee.Id == currentUser.EmployeeId.Value && employee.IsActive &&
                employee.CompanyId == companyId && employee.DepartmentId == departmentId, ct);
        }
        if (!canManage)
            throw new AppForbiddenException("ไม่มีสิทธิ์จัดการใบแจ้งเรื่องของแผนกนี้");
    }

    public static async Task EnsureTicketAsync(
        IApplicationDbContext db,
        ICurrentUser currentUser,
        IPermissionService permissionService,
        string permission,
        Ticket ticket,
        CancellationToken ct)
    {
        await EnsureDepartmentAsync(
            db, currentUser, permissionService, permission,
            ticket.TargetCompanyId, ticket.TargetDepartmentId, ct);
    }

    public static IQueryable<Ticket> ApplyDepartmentScope(
        IQueryable<Ticket> query,
        ICurrentUser currentUser,
        IApplicationDbContext db)
    {
        if (currentUser.HasRole(RoleType.Admin)) return query;

        var employeeId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");
        var ownDepartmentId = currentUser.HasRole(RoleType.Supervisor, currentUser.CompanyId)
            ? currentUser.DepartmentId
            : null;
        var roleDepartmentIds = currentUser.Roles
            .Where(role => role.Role == RoleType.Supervisor.ToString() && role.DepartmentId.HasValue)
            .Select(role => role.DepartmentId!.Value)
            .ToList();
        var hasSupervisorRole = currentUser.HasRole(RoleType.Supervisor);
        return query.Where(t =>
            t.TargetDepartment.ManagerEmployeeId == employeeId ||
            (ownDepartmentId.HasValue && t.TargetDepartmentId == ownDepartmentId.Value) ||
            roleDepartmentIds.Contains(t.TargetDepartmentId) ||
            (hasSupervisorRole && db.Employees.Any(employee =>
                employee.Id == employeeId && employee.IsActive &&
                employee.CompanyId == t.TargetCompanyId && employee.DepartmentId == t.TargetDepartmentId)));
    }
}
