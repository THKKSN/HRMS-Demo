using Hrms.Domain.Enums;

namespace Hrms.Application.Features.Attendance.Dtos;

public record AttendanceRecordHrDto(
    Guid Id,
    Guid EmployeeId,
    string EmployeeFullName,
    string EmployeeCode,
    string? CompanyName,
    string? DepartmentName,
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
    int? WorkDurationMinutes,
    AttendanceStatus Status,
    string? Remark,
    DateTime CreatedAt,
    DateTime UpdatedAt);
