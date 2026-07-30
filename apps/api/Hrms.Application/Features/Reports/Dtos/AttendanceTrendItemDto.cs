namespace Hrms.Application.Features.Reports.Dtos;

public record AttendanceTrendItemDto(
    DateOnly Date,
    int Present,
    int Late,
    int HalfDay,
    int Absent,
    int OnLeave,
    int Total,
    decimal Rate);
