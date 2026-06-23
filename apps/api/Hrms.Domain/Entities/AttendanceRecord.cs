using Hrms.Domain.Common;
using Hrms.Domain.Enums;

namespace Hrms.Domain.Entities;

public class AttendanceRecord : BaseEntity
{
    public Guid EmployeeId { get; set; }
    public Guid? LocationId { get; set; }
    public DateOnly Date { get; set; }

    public DateTime? CheckInTime { get; set; }
    public DateTime? CheckOutTime { get; set; }

    public double? CheckInLatitude { get; set; }
    public double? CheckInLongitude { get; set; }
    public double? CheckOutLatitude { get; set; }
    public double? CheckOutLongitude { get; set; }

    public string? CheckInSelfieUrl { get; set; }
    public string? CheckOutSelfieUrl { get; set; }

    public bool IsLate { get; set; }
    public int LateMinutes { get; set; }
    public AttendanceStatus Status { get; set; } = AttendanceStatus.Present;
    public string? Remark { get; set; }

    public Employee Employee { get; set; } = null!;
    public Location? Location { get; set; }
}
