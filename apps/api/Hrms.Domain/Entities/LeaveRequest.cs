using Hrms.Domain.Common;
using Hrms.Domain.Enums;

namespace Hrms.Domain.Entities;

public class LeaveRequest : BaseEntity
{
    public Guid EmployeeId { get; set; }
    public Guid LeaveTypeId { get; set; }
    public DateOnly DateFrom { get; set; }
    public DateOnly DateTo { get; set; }
    public HalfDayType HalfDay { get; set; } = HalfDayType.Full;
    public decimal TotalDays { get; set; }
    public string? Reason { get; set; }
    public string? AttachmentUrl { get; set; }
    public LeaveStatus Status { get; set; } = LeaveStatus.PendingSupervisor;
    public Guid? SupervisorId { get; set; }
    public Guid? HrId { get; set; }
    public string? SupervisorComment { get; set; }
    public string? HrComment { get; set; }
    public DateTime? SupervisorApprovedAt { get; set; }
    public DateTime? HrApprovedAt { get; set; }

    public Employee Employee { get; set; } = null!;
    public LeaveType LeaveType { get; set; } = null!;
}
