namespace Hrms.Application.Features.Reports.Dtos;

public record AttendanceMonthlySummaryDto(
    Guid EmployeeId,
    string EmployeeCode,
    string EmployeeFullName,
    string? DepartmentName,
    int WorkingDays,
    int PresentDays,
    int LateDays,
    int HalfDays,
    int AbsentDays,
    int LeaveDays,
    int TotalLateMinutes,
    decimal AttendanceRate);
