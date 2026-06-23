using Hrms.Domain.Enums;

namespace Hrms.Application.Features.Attendance.Dtos;

public record AttendanceTodayDto(
    Guid? Id,
    DateOnly Date,
    DateTime? CheckInTime,
    DateTime? CheckOutTime,
    double? CheckInLatitude,
    double? CheckInLongitude,
    string? CheckInSelfieUrl,
    string? CheckOutSelfieUrl,
    Guid? LocationId,
    string? LocationName,
    bool IsLate,
    int LateMinutes,
    AttendanceStatus? Status,
    string? Remark,
    bool CanCheckIn,
    bool CanCheckOut,
    string? ShiftName,
    TimeOnly? ShiftStart,
    TimeOnly? ShiftEnd);
