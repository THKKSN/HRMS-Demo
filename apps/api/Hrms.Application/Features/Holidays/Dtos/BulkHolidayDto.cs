namespace Hrms.Application.Features.Holidays.Dtos;

public record BulkHolidayItem(string Name, DateOnly Date, Guid? CompanyId);

public record BulkCreateHolidaysResult(int Created, int Skipped);
