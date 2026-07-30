using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
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
            .Select(l => new AdminAuditLogItem(
                l.Id.ToString(),
                l.Module,
                l.Action,
                l.Description,
                l.PerformedByName,
                l.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss")))
            .ToListAsync(ct);

        return new AdminDashboardDto(
            totalCompanies,
            totalDepartments,
            totalEmployees,
            activeEmployees,
            recentLogs);
    }
}
