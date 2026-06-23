using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Helpers;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Attendance.Common;
using Hrms.Application.Features.Attendance.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Attendance.Queries.GetMyAttendanceToday;

public class GetMyAttendanceTodayHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser)
    : IRequestHandler<GetMyAttendanceTodayQuery, AttendanceTodayDto>
{
    public async Task<AttendanceTodayDto> Handle(GetMyAttendanceTodayQuery request, CancellationToken ct)
    {
        var employeeId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

        var employee = await db.Employees
            .FirstOrDefaultAsync(e => e.Id == employeeId && e.IsActive, ct)
            ?? throw new AppUnauthorizedException("EMPLOYEE_NOT_FOUND");

        var today = ThaiDateTime.Today;

        var shift = await db.Shifts
            .Where(s => s.CompanyId == employee.CompanyId && s.IsActive)
            .OrderBy(s => s.StartTime)
            .FirstOrDefaultAsync(ct);

        var record = await db.AttendanceRecords
            .Include(r => r.Employee)
            .Include(r => r.Location)
            .FirstOrDefaultAsync(r => r.EmployeeId == employeeId && r.Date == today, ct);

        return record == null
            ? AttendanceMappingExtensions.EmptyToday(today, shift)
            : record.ToTodayDto(shift);
    }
}
