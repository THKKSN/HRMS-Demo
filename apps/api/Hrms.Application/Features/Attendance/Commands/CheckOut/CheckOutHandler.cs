using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Helpers;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Attendance.Common;
using Hrms.Application.Features.Attendance.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Attendance.Commands.CheckOut;

public class CheckOutHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser)
    : IRequestHandler<CheckOutCommand, AttendanceTodayDto>
{
    public async Task<AttendanceTodayDto> Handle(CheckOutCommand request, CancellationToken ct)
    {
        var employeeId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

        var today = ThaiDateTime.Today;

        var record = await db.AttendanceRecords
            .Include(r => r.Employee)
            .Include(r => r.Location)
            .FirstOrDefaultAsync(r => r.EmployeeId == employeeId && r.Date == today, ct);

        if (record?.CheckInTime == null)
            throw new ConflictException("NOT_CHECKED_IN", "ยังไม่ได้เช็คอินวันนี้");

        if (record.CheckOutTime != null)
            throw new ConflictException("ALREADY_CHECKED_OUT", "เช็คเอาท์วันนี้ไปแล้ว");

        record.CheckOutTime = ThaiDateTime.Now;
        record.CheckOutLatitude = request.Latitude;
        record.CheckOutLongitude = request.Longitude;
        record.CheckOutSelfieUrl = request.SelfieUrl;

        await db.SaveChangesAsync(ct);

        var shift = await db.Shifts
            .Where(s => s.CompanyId == record.Employee.CompanyId && s.IsActive)
            .OrderBy(s => s.StartTime)
            .FirstOrDefaultAsync(ct);

        return record.ToTodayDto(shift);
    }
}
