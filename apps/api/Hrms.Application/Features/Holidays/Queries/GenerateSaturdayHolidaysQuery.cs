using Hrms.Application.Features.Holidays.Dtos;
using MediatR;

namespace Hrms.Application.Features.Holidays.Queries;

/// <summary>
/// คำนวณวันเสาร์ทั้งปีที่เป็นวันหยุด (ยกเว้นเสาร์แรกของแต่ละเดือน = วันทำงาน)
/// ไม่บันทึก DB — ใช้สำหรับ preview ก่อน bulk create
/// </summary>
public record GenerateSaturdayHolidaysQuery(
    int Year,
    Guid? CompanyId,
    string HolidayName = "วันหยุดประจำสัปดาห์") : IRequest<List<BulkHolidayItem>>;

public class GenerateSaturdayHolidaysHandler
    : IRequestHandler<GenerateSaturdayHolidaysQuery, List<BulkHolidayItem>>
{
    public Task<List<BulkHolidayItem>> Handle(GenerateSaturdayHolidaysQuery request, CancellationToken ct)
    {
        // หาเสาร์แรกของแต่ละเดือน (= วันทำงาน, ยกเว้นออกจากผลลัพธ์)
        var firstSaturdays = Enumerable.Range(1, 12)
            .Select(month =>
            {
                var d = new DateOnly(request.Year, month, 1);
                while (d.DayOfWeek != DayOfWeek.Saturday)
                    d = d.AddDays(1);
                return d;
            })
            .ToHashSet();

        // วนหาเสาร์แรกของปี แล้ว iterate ทุก 7 วัน
        var current = new DateOnly(request.Year, 1, 1);
        while (current.DayOfWeek != DayOfWeek.Saturday)
            current = current.AddDays(1);

        var result = new List<BulkHolidayItem>();
        while (current.Year == request.Year)
        {
            if (!firstSaturdays.Contains(current))
                result.Add(new BulkHolidayItem(request.HolidayName, current, request.CompanyId));

            current = current.AddDays(7);
        }

        return Task.FromResult(result);
    }
}
