using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Holidays.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.WeeklyHolidaySchedules.Queries;

/// <summary>
/// คำนวณรายการวันหยุดจากกฎ WeeklyHolidaySchedule สำหรับปีที่ระบุ
/// ไม่บันทึก DB — ใช้สำหรับ preview ก่อน bulk create
/// </summary>
public record PreviewHolidaysFromScheduleQuery(Guid ScheduleId, int Year)
    : IRequest<List<BulkHolidayItem>>;

public class PreviewHolidaysFromScheduleHandler(IApplicationDbContext db, IScopeGuard scope)
    : IRequestHandler<PreviewHolidaysFromScheduleQuery, List<BulkHolidayItem>>
{
    public async Task<List<BulkHolidayItem>> Handle(
        PreviewHolidaysFromScheduleQuery request, CancellationToken ct)
    {
        var schedule = await db.WeeklyHolidaySchedules
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == request.ScheduleId && s.IsActive, ct)
            ?? throw new KeyNotFoundException($"ไม่พบ WeeklyHolidaySchedule Id '{request.ScheduleId}'");

        if (schedule.CompanyId.HasValue)
            await scope.ThrowIfCannotAccessAsync(schedule.CompanyId.Value, ct);

        return GenerateHolidays(schedule, request.Year);
    }

    internal static List<BulkHolidayItem> GenerateHolidays(
        Domain.Entities.WeeklyHolidaySchedule schedule, int year)
    {
        // หา occurrence ที่เป็นวันทำงาน (ต้องยกเว้นออกจากวันหยุด)
        var workDaySet = schedule.WorkDayOccurrences.ToHashSet();

        // หาวันแรกของปีที่ตรง DayOfWeek ที่ต้องการ
        var current = new DateOnly(year, 1, 1);
        while (current.DayOfWeek != schedule.DayOfWeek)
            current = current.AddDays(1);

        var result = new List<BulkHolidayItem>();

        while (current.Year == year)
        {
            // หา occurrence ที่ current อยู่ในเดือนนั้น (1=first, 2=second, ...)
            var occurrence = GetOccurrenceInMonth(current);

            if (!workDaySet.Contains(occurrence))
                result.Add(new BulkHolidayItem(schedule.Name, current, schedule.CompanyId));

            current = current.AddDays(7);
        }

        return result;
    }

    // คำนวณว่าวันนี้เป็น occurrence ที่เท่าไหร่ของ DayOfWeek ในเดือนนั้น
    private static int GetOccurrenceInMonth(DateOnly date)
        => (date.Day - 1) / 7 + 1;
}
