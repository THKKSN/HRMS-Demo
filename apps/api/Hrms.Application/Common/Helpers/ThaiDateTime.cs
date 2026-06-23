namespace Hrms.Application.Common.Helpers;

public static class ThaiDateTime
{
    private static readonly TimeZoneInfo Tz =
        TimeZoneInfo.GetSystemTimeZones()
            .FirstOrDefault(z => z.Id == "SE Asia Standard Time" || z.Id == "Asia/Bangkok")
        ?? TimeZoneInfo.Utc;

    public static DateTime Now => TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, Tz);

    public static DateOnly Today => DateOnly.FromDateTime(Now);
}
