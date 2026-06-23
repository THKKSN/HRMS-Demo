using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Helpers;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Attendance.Common;
using Hrms.Application.Features.Attendance.Dtos;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Attendance.Commands.CheckIn;

public class CheckInHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IGeofenceService geofence)
    : IRequestHandler<CheckInCommand, AttendanceTodayDto>
{
    public async Task<AttendanceTodayDto> Handle(CheckInCommand request, CancellationToken ct)
    {
        var employeeId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

        var employee = await db.Employees
            .FirstOrDefaultAsync(e => e.Id == employeeId && e.IsActive, ct)
            ?? throw new KeyNotFoundException("ไม่พบข้อมูลพนักงาน");

        var location = await db.Locations
            .FirstOrDefaultAsync(l => l.Id == request.LocationId && l.IsActive, ct)
            ?? throw new KeyNotFoundException("ไม่พบสถานที่ที่ระบุ");

        var now   = ThaiDateTime.Now;
        var today = ThaiDateTime.Today;

        var existing = await db.AttendanceRecords
            .FirstOrDefaultAsync(r => r.EmployeeId == employeeId && r.Date == today, ct);

        if (existing?.CheckInTime != null)
            throw new ConflictException("ALREADY_CHECKED_IN", "เช็คอินวันนี้ไปแล้ว");

        var effectiveRadius = Math.Max(location.RadiusMeters, 100);
        if (!geofence.IsWithinGeofence(
                location.Latitude, location.Longitude, effectiveRadius,
                request.Latitude, request.Longitude))
            throw new ConflictException("OUT_OF_GEOFENCE", "ตำแหน่งปัจจุบันอยู่นอกพื้นที่ที่กำหนด");

        var shift = await db.Shifts
            .Where(s => s.CompanyId == employee.CompanyId && s.IsActive)
            .OrderBy(s => s.StartTime)
            .FirstOrDefaultAsync(ct);

        var checkInTimeOnly = TimeOnly.FromDateTime(now);
        var isLate = false;
        var lateMinutes = 0;

        if (shift != null)
        {
            var deadline = shift.StartTime.AddMinutes(shift.GracePeriodMinutes);
            if (checkInTimeOnly > deadline)
            {
                isLate = true;
                lateMinutes = (int)(checkInTimeOnly - shift.StartTime).TotalMinutes;
            }
        }

        AttendanceRecord record;
        if (existing == null)
        {
            record = new AttendanceRecord
            {
                EmployeeId = employeeId,
                LocationId = request.LocationId,
                Date = today,
            };
            db.AttendanceRecords.Add(record);
        }
        else
        {
            record = existing;
            record.LocationId = request.LocationId;
        }

        record.CheckInTime = now;
        record.CheckInLatitude = request.Latitude;
        record.CheckInLongitude = request.Longitude;
        record.CheckInSelfieUrl = request.SelfieUrl;
        record.IsLate = isLate;
        record.LateMinutes = lateMinutes;
        record.Status = isLate ? AttendanceStatus.Late : AttendanceStatus.Present;

        await db.SaveChangesAsync(ct);

        // reload with navigations for mapping
        record.Employee = employee;
        record.Location = location;

        return record.ToTodayDto(shift);
    }
}
