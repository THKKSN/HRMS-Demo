using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public class TicketProgressEntry : BaseEntity
{
    public Guid TicketId { get; set; }
    public string WorkflowStepKey { get; set; } = string.Empty;
    public string? WorkState { get; set; }
    public string? BlockerReason { get; set; }
    public string? NextAction { get; set; }
    public bool IsCompleted { get; set; }
    public string? Note { get; set; }
    public Guid? OwnerEmployeeId { get; set; }
    public DateTime? DueAt { get; set; }
    public Guid? CreatedByEmployeeId { get; set; }
    public Guid? CreatedByExternalReporterId { get; set; }
    /// <summary>เวลาที่ปักหมุดการ์ด (UTC+7) — null = ไม่ได้ปัก ใช้เรียงการ์ดที่ปักไว้ขึ้นบนสุดของบอร์ด</summary>
    public DateTime? PinnedAt { get; set; }
    public Guid? PinnedByEmployeeId { get; set; }

    public Ticket Ticket { get; set; } = null!;
    public Employee? OwnerEmployee { get; set; }
    public Employee? CreatedByEmployee { get; set; }
    public Employee? PinnedByEmployee { get; set; }
    public ExternalReporter? CreatedByExternalReporter { get; set; }
    public ICollection<TicketAttachment> Attachments { get; set; } = new List<TicketAttachment>();
}
