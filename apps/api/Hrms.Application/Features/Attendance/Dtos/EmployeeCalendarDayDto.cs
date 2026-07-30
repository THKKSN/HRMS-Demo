using Hrms.Domain.Enums;

namespace Hrms.Application.Features.Attendance.Dtos;

public record EmployeeCalendarDayDto(
    DateOnly Date,
    bool IsWorkingDay,
    bool IsHoliday,
    string? HolidayName,
    AttendanceStatus? Status,
    DateTime? CheckInTime,
    DateTime? CheckOutTime,
    int? WorkDurationMinutes,
    bool IsLate,
    int LateMinutes,
    bool IsOnLeave,
    string? LeaveTypeName,
    string? Remark
);
