using Hrms.Domain.Common;
using Hrms.Domain.Enums;

namespace Hrms.Domain.Entities;

public class TicketAssignment : BaseEntity
{
    public Guid TicketId { get; set; }
    public Guid AssignedToEmployeeId { get; set; }
    public Guid? AssignedByEmployeeId { get; set; }
    public DateTime AssignedAt { get; set; }
    public bool IsPrimary { get; set; } = true;
    public bool IsActive { get; set; } = true;
    /// <summary>
    /// บทบาทในทีมของใบแจ้งเรื่อง — ต้องสอดคล้องกับ <see cref="IsPrimary"/> เสมอ
    /// (Owner ⇔ IsPrimary = true, Member ⇔ IsPrimary = false) query เดิมที่กรอง IsPrimary จึงยังถูกต้อง
    /// </summary>
    public TicketAssignmentRole MemberRole { get; set; } = TicketAssignmentRole.Owner;
    /// <summary>ใช้เฉพาะแถว Owner (ค่า "Primary") — แถว Member ต้องเป็น null เพราะมี unique index (TicketId, ActiveSlot)</summary>
    public string? ActiveSlot { get; set; } = "Primary";
    public DateTime? EndedAt { get; set; }
    public Guid? EndedByEmployeeId { get; set; }
    public string? Note { get; set; }
    public TicketAssignmentSource AssignmentSource { get; set; } = TicketAssignmentSource.Manual;
    public Guid? ResponsibilityId { get; set; }
    public TicketRoutingLevel RoutingLevelSnapshot { get; set; } = TicketRoutingLevel.None;

    public Ticket Ticket { get; set; } = null!;
    public Employee AssignedToEmployee { get; set; } = null!;
    public Employee? AssignedByEmployee { get; set; }
    public Employee? EndedByEmployee { get; set; }
    public EmployeeResponsibility? Responsibility { get; set; }
}
