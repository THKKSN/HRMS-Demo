using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>ผูกเหตุผลปิดงานกับหมวดแจ้งเรื่อง (เลือกได้หลายหมวด) — เหตุผลที่ไม่มีแถวในตารางนี้ = ใช้ได้ทุกหมวด</summary>
public class TicketCloseoutReasonCategory : BaseEntity
{
    public Guid CloseoutReasonId { get; set; }
    public Guid CategoryId { get; set; }

    public TicketCloseoutReason CloseoutReason { get; set; } = null!;
    public TicketCategory Category { get; set; } = null!;
}
