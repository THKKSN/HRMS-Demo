using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Attendance.Common;
using Hrms.Application.Features.Attendance.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Attendance.Queries.GetAttendanceByDate;

public class GetAttendanceByDateHandler(
    IApplicationDbContext db,
    IScopeGuard scope,
    ICurrentUser currentUser)
    : IRequestHandler<GetAttendanceByDateQuery, List<AttendanceRecordDto>>
{
    public async Task<List<AttendanceRecordDto>> Handle(
        GetAttendanceByDateQuery request, CancellationToken ct)
    {
        if (!currentUser.IsSupervisorOrAbove())
            throw new AppForbiddenException("ต้องมีสิทธิ์ Supervisor ขึ้นไปจึงจะดูรายงานได้");

        var companyId = currentUser.CompanyId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

        await scope.ThrowIfCannotAccessAsync(companyId, ct);

        var query = db.AttendanceRecords
            .Include(r => r.Employee).ThenInclude(e => e.Department)
            .Include(r => r.Location)
            .Where(r => r.Date == request.Date && r.Employee.CompanyId == companyId)
            .AsQueryable();

        // Supervisor เห็นเฉพาะ department ที่ตัวเองดูแล
        if (!currentUser.IsAdminOrHr())
        {
            var supervisorDeptId = currentUser.Roles
                .Where(r => r.Role == RoleType.Supervisor.ToString() && r.CompanyId == companyId)
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
