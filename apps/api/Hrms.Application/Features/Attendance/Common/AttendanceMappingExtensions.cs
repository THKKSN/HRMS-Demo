using Hrms.Application.Features.Attendance.Dtos;
using Hrms.Domain.Entities;

namespace Hrms.Application.Features.Attendance.Common;

public static class AttendanceMappingExtensions
{
    public static AttendanceRecordDto ToDto(this AttendanceRecord r) => new(
        r.Id,
        r.EmployeeId,
        $"{r.Employee.FirstName} {r.Employee.LastName}".Trim(),
        r.Employee.EmployeeCode,
        r.Date,
        r.CheckInTime,
        r.CheckOutTime,
        r.CheckInLatitude,
        r.CheckInLongitude,
        r.CheckInSelfieUrl,
        r.CheckOutSelfieUrl,
        r.LocationId,
        r.Location?.Name,
        r.IsLate,
        r.LateMinutes,
        r.Status,
        r.Remark);

    public static AttendanceTodayDto ToTodayDto(this AttendanceRecord r, Shift? shift) => new(
        r.Id,
        r.Date,
        r.CheckInTime,
        r.CheckOutTime,
        r.CheckInLatitude,
        r.CheckInLongitude,
        r.CheckInSelfieUrl,
        r.CheckOutSelfieUrl,
        r.LocationId,
        r.Location?.Name,
        r.IsLate,
        r.LateMinutes,
        r.Status,
        r.Remark,
        CanCheckIn:  r.CheckInTime == null,
        CanCheckOut: r.CheckInTime != null && r.CheckOutTime == null,
        ShiftName:  shift?.Name,
        ShiftStart: shift?.StartTime,
        ShiftEnd:   shift?.EndTime);

    public static AttendanceTodayDto EmptyToday(DateOnly date, Shift? shift) => new(
        Id:              null,
        Date:            date,
        CheckInTime:     null,
        CheckOutTime:    null,
        CheckInLatitude:  null,
        CheckInLongitude: null,
        CheckInSelfieUrl:  null,
        CheckOutSelfieUrl: null,
        LocationId:   null,
        LocationName: null,
        IsLate:       false,
        LateMinutes:  0,
        Status:       null,
        Remark:       null,
        CanCheckIn:   true,
        CanCheckOut:  false,
        ShiftName:    shift?.Name,
        ShiftStart:   shift?.StartTime,
        ShiftEnd:     shift?.EndTime);
}
