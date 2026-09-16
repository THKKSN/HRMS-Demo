using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.AuditLogs.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Dashboard.Queries.GetAdminDashboard;

public class GetAdminDashboardHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permService)
    : IRequestHandler<GetAdminDashboardQuery, AdminDashboardDto>
{
    public async Task<AdminDashboardDto> Handle(GetAdminDashboardQuery request, CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permService, "system:view-audit-logs", ct);

        var totalCompanies    = await db.Companies.CountAsync(c => c.IsActive, ct);
        var totalDepartments  = await db.Departments.CountAsync(d => d.IsActive, ct);
        var totalEmployees    = await db.Employees.CountAsync(ct);
        var activeEmployees   = await db.Employees.CountAsync(e => e.IsActive, ct);

        var recentLogs = await db.AuditLogs
            .OrderByDescending(l => l.CreatedAt)
            .Take(10)
            .Select(l => new AuditLogDto(
                l.Id,
                l.Module,
                l.EntityType,
                l.EntityId,
                l.Action,
                l.Description,
                l.OldValues,
                l.NewValues,
                l.PerformedByEmployeeId,
                l.PerformedByName,
                db.Employees
                    .Where(e => e.Id == l.PerformedByEmployeeId)
                    .Select(e => e.AvatarUrl)
                    .FirstOrDefault(),
                l.CreatedAt))
            .ToListAsync(ct);

        return new AdminDashboardDto(
            totalCompanies,
            totalDepartments,
            totalEmployees,
            activeEmployees,
            recentLogs);
    }
}
