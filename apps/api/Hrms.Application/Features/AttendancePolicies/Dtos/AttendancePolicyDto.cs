namespace Hrms.Application.Features.AttendancePolicies.Dtos;

public record AttendancePolicyDto(
    Guid   Id,
    Guid   CompanyId,
    string CompanyName,
    int    MaxLateMinutesPerMonth,
    int    MaxLateCountPerMonth,
    int    MaxAbsenceCountPerMonth,
    bool   IsActive
);

public record AttendanceMonthlyViolationDto(
    Guid   EmployeeId,
    string EmployeeName,
    int    Year,
    int    Month,
    int    TotalLateCount,
    int    TotalLateMinutes,
    int    TotalAbsenceCount,
    bool   IsLateCountViolated,
    bool   IsLateMinutesViolated,
    bool   IsAbsenceViolated,
    bool   IsViolated
);
