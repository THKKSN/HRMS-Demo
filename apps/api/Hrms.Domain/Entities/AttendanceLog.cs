using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public class AttendanceLog : BaseEntity
{
    public Guid EmployeeId { get; set; }
    public DateTime CheckInAt { get; set; }
    public DateTime? CheckOutAt { get; set; }
    public decimal? CheckInLat { get; set; }
    public decimal? CheckInLng { get; set; }
    public decimal? CheckOutLat { get; set; }
    public decimal? CheckOutLng { get; set; }
    public string? SelfieUrl { get; set; }
    public bool IsLate { get; set; }
    public int? WorkMinutes { get; set; }

    public Employee Employee { get; set; } = null!;
}
