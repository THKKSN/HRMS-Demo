using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Enums;

namespace Hrms.Infrastructure.Services;

public class WorkingDayCalculator : IWorkingDayCalculator
{
    public decimal Calculate(DateOnly dateFrom, DateOnly dateTo, HalfDayType halfDay, WorkDayFlags workDays)
    {
        if (halfDay != HalfDayType.Full)
            return 0.5m;

        decimal days = 0;
        for (var d = dateFrom; d <= dateTo; d = d.AddDays(1))
        {
            if (IsWorkingDay(d.DayOfWeek, workDays))
                days++;
        }
        return days;
    }

    private static bool IsWorkingDay(DayOfWeek dow, WorkDayFlags workDays) => dow switch
    {
        DayOfWeek.Monday    => workDays.HasFlag(WorkDayFlags.Monday),
        DayOfWeek.Tuesday   => workDays.HasFlag(WorkDayFlags.Tuesday),
        DayOfWeek.Wednesday => workDays.HasFlag(WorkDayFlags.Wednesday),
        DayOfWeek.Thursday  => workDays.HasFlag(WorkDayFlags.Thursday),
        DayOfWeek.Friday    => workDays.HasFlag(WorkDayFlags.Friday),
        DayOfWeek.Saturday  => workDays.HasFlag(WorkDayFlags.Saturday),
        DayOfWeek.Sunday    => workDays.HasFlag(WorkDayFlags.Sunday),
        _                   => false,
    };
}
