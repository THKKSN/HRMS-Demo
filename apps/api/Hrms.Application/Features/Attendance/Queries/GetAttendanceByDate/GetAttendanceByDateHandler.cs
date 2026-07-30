using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Attendance.Common;
using Hrms.Application.Features.Attendance.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Attendance.Queries.GetAttendanceByDate;

public class GetAttendanceByDateHandler(
    IApplicationDbContext db,
    IScopeGuard scope,
    ICurrentUser currentUser,
    IPermissionService permService)
    : IRequestHandler<GetAttendanceByDateQuery, List<AttendanceRecordDto>>
{
    public async Task<List<AttendanceRecordDto>> Handle(
        GetAttendanceByDateQuery request, CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permService, "attendance:view-team", ct);

        var companyId = currentUser.CompanyId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

        await scope.ThrowIfCannotAccessAsync(companyId, ct);

        var query = db.AttendanceRecords
            .Include(r => r.Employee).ThenInclude(e => e.Department)
            .Include(r => r.Location)
            .Where(r => r.Date == request.Date && r.Employee.CompanyId == companyId)
            .AsQueryable();

        // ผู้ที่ไม่มี attendance:view-all เห็นเฉพาะ department ที่ตัวเองดูแล
        var canViewAll = await permService.HasPermissionAsync(currentUser, "attendance:view-all", ct);
        if (!canViewAll)
        {
            var supervisorDeptId = currentUser.Roles
                .Where(r => r.CompanyId == companyId)
                .Select(r => r.DepartmentId)
                .FirstOrDefault();

            if (supervisorDeptId.HasValue)
                query = query.Where(r => r.Employee.DepartmentId == supervisorDeptId.Value);
        }

        var records = await query
            .OrderBy(r => r.Employee.EmployeeCode)
            .ToListAsync(ct);

        return records.Select(r => r.ToDto()).ToList();
    }
}
