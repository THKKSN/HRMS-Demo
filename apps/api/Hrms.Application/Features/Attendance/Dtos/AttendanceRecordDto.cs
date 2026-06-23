using Hrms.Domain.Enums;

namespace Hrms.Application.Features.Attendance.Dtos;

public record AttendanceRecordDto(
    Guid Id,
    Guid EmployeeId,
    string EmployeeFullName,
    string EmployeeCode,
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
    AttendanceStatus Status,
    string? Remark);
