using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public class WeeklyHolidaySchedule : BaseEntity
{
    /// <summary>null = global (ทุก company), ระบุ = เฉพาะ company นั้น</summary>
    public Guid? CompanyId { get; set; }
    public Company? Company { get; set; }

    public string Name { get; set; } = string.Empty;

    /// <summary>วันในสัปดาห์ที่ generate เป็นวันหยุด (0=Sun, 1=Mon, ..., 6=Sat)</summary>
    public DayOfWeek DayOfWeek { get; set; }

    /// <summary>
    /// occurrence ของ DayOfWeek ในเดือนที่ถือเป็นวันทำงาน (ไม่ generate เป็นวันหยุด)
    /// [1] = เสาร์แรกของเดือนทำงาน | [1,3] = เสาร์ที่1และ3ทำงาน | [] = หยุดทุกสัปดาห์
    /// </summary>
    public List<int> WorkDayOccurrences { get; set; } = [];

    public bool IsActive { get; set; } = true;
}
