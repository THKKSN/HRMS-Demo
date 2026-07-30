using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Reports.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Reports.Queries.GetAttendanceTrend;

public class GetAttendanceTrendHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permService)
    : IRequestHandler<GetAttendanceTrendQuery, IReadOnlyList<AttendanceTrendItemDto>>
{
    public async Task<IReadOnlyList<AttendanceTrendItemDto>> Handle(
        GetAttendanceTrendQuery request, CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permService, "attendance:report", ct);

        var companyId = currentUser.CompanyId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

        var today    = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7));
        var dateTo   = request.DateTo   ?? today;
        var dateFrom = request.DateFrom ?? dateTo.AddDays(-29); // default 30 วัน

        var totalEmployees = await db.Employees
            .CountAsync(e => e.CompanyId == companyId && e.IsActive, ct);

        // โหลด attendance records ทั้งช่วง — group by date+status
        var records = await db.AttendanceRecords
            .Where(r => r.Date >= dateFrom
                     && r.Date <= dateTo
                     && r.Employee.CompanyId == companyId
                     && r.Employee.IsActive)
            .Select(r => new { r.Date, r.EmployeeId, r.Status })
            .ToListAsync(ct);

        // map: date -> employeeIds ที่มี record
        var recordedByDate = records
            .GroupBy(r => r.Date)
            .ToDictionary(g => g.Key, g => g.Select(x => x.EmployeeId).ToHashSet());

        // count by date+status
        var countByDate = records
            .GroupBy(r => r.Date)
            .ToDictionary(g => g.Key, g => new
            {
                Present = g.Count(r => r.Status == AttendanceStatus.Present),
                Late    = g.Count(r => r.Status == AttendanceStatus.Late),
                HalfDay = g.Count(r => r.Status == AttendanceStatus.HalfDay),
                Absent  = g.Count(r => r.Status == AttendanceStatus.Absent),
            });

        // approved leave ทั้งช่วง
        var leaves = await db.LeaveRequests
            .Where(l => l.Employee.CompanyId == companyId
                     && l.Status == LeaveStatus.Approved
                     && l.DateFrom <= dateTo
                     && l.DateTo   >= dateFrom)
            .Select(l => new { l.EmployeeId, l.DateFrom, l.DateTo })
            .ToListAsync(ct);

        var result = new List<AttendanceTrendItemDto>();

        for (var d = dateFrom; d <= dateTo; d = d.AddDays(1))
        {
            var cnt       = countByDate.TryGetValue(d, out var c) ? c : null;
            var recorded  = recordedByDate.TryGetValue(d, out var s) ? s : [];

            int present = cnt?.Present ?? 0;
            int late    = cnt?.Late    ?? 0;
            int halfDay = cnt?.HalfDay ?? 0;
            int absent  = cnt?.Absent  ?? 0;

            int onLeave = leaves.Count(l => l.DateFrom <= d && l.DateTo >= d
                                         && !recorded.Contains(l.EmployeeId));

            decimal rate = totalEmployees > 0
                ? Math.Round((present + late + halfDay) * 100m / totalEmployees, 1)
                : 0;

            result.Add(new AttendanceTrendItemDto(
                d, present, late, halfDay, absent, onLeave, totalEmployees, rate));
        }

        return result;
    }
}
