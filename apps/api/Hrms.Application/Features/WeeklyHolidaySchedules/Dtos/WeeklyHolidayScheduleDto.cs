namespace Hrms.Application.Features.WeeklyHolidaySchedules.Dtos;

public record WeeklyHolidayScheduleDto(
    Guid Id,
    Guid? CompanyId,
    string? CompanyName,
    string Name,
    DayOfWeek DayOfWeek,
    List<int> WorkDayOccurrences,
    bool IsActive);
