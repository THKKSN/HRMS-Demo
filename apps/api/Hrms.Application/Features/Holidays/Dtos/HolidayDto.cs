namespace Hrms.Application.Features.Holidays.Dtos;

public record HolidayDto(
    Guid Id,
    Guid? CompanyId,
    string? CompanyName,
    string Name,
    DateOnly Date,
    bool IsActive);
