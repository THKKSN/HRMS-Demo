using Hrms.Domain.Common;
using Hrms.Domain.Enums;

namespace Hrms.Domain.Entities;

public class OtRequest : BaseEntity
{
    public Guid EmployeeId { get; set; }

    /// <summary>วันที่ทำ OT</summary>
    public DateOnly Date { get; set; }

    /// <summary>เวลาเริ่ม OT (Thai time)</summary>
    public TimeOnly StartTime { get; set; }

    /// <summary>เวลาสิ้นสุด OT (Thai time)</summary>
    public TimeOnly EndTime { get; set; }

    /// <summary>ชั่วโมง OT ทั้งหมด (คำนวณจาก Start–End)</summary>
    public decimal TotalHours { get; set; }

    public OtRateType RateType { get; set; }

    public string? Reason { get; set; }

    public OtStatus Status { get; set; } = OtStatus.PendingSupervisor;

    public Guid? SupervisorId { get; set; }
    public string? SupervisorComment { get; set; }
    public DateTime? SupervisorApprovedAt { get; set; }

    public Guid? HrId { get; set; }
    public string? HrComment { get; set; }
    public DateTime? HrAcknowledgedAt { get; set; }

    // Navigation
    public Employee Employee { get; set; } = null!;
    public Employee? Supervisor { get; set; }
    public Employee? Hr { get; set; }
}
