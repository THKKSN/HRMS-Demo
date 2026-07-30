using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public class AttendancePolicy : BaseEntity
{
    public Guid CompanyId { get; set; }

    /// <summary>จำนวนนาทีสายสะสมสูงสุดต่อเดือน (0 = ไม่จำกัด)</summary>
    public int MaxLateMinutesPerMonth { get; set; } = 90;

    /// <summary>จำนวนครั้งสายสูงสุดต่อเดือน (0 = ไม่จำกัด)</summary>
    public int MaxLateCountPerMonth { get; set; } = 10;

    /// <summary>จำนวนครั้งขาดงานสูงสุดต่อเดือน (0 = ไม่จำกัด)</summary>
    public int MaxAbsenceCountPerMonth { get; set; } = 3;

    public bool IsActive { get; set; } = true;

    public Company Company { get; set; } = null!;
}
