namespace Hrms.Application.Features.Attendance.Dtos;

public record EmployeeMonthlyStatsDto(
    Guid EmployeeId,
    string EmployeeFullName,
    string EmployeeCode,
    string? CompanyName,
    string? DepartmentName,
    int Year,
    int Month,
    int WorkingDays,
    int PresentDays,
    int LateDays,
    int HalfDays,
    int AbsentDays,
    int LeaveDays,
    int NotRecordedDays,
    int TotalLateMinutes,
    decimal AttendanceRate,
    int? AvgWorkDurationMinutes
);
