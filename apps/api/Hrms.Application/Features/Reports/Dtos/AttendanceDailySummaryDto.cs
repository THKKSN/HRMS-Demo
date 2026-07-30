namespace Hrms.Application.Features.Reports.Dtos;

public record AttendanceDailySummaryDto(
    DateOnly Date,
    int TotalEmployees,
    int Present,
    int Late,
    int HalfDay,
    int Absent,
    int OnLeave,
    int NotRecorded,
    decimal AttendanceRate,
    IReadOnlyList<AbsentLateItemDto> TopAbsent,
    IReadOnlyList<AbsentLateItemDto> TopLate);
