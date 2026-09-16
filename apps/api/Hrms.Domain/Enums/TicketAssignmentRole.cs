namespace Hrms.Domain.Enums;

/// <summary>
/// บทบาทของแถว assignment ในใบแจ้งเรื่อง — Owner คือผู้รับผิดชอบหลัก (1 คนต่อใบ, IsPrimary = true)
/// Member คือผู้ร่วมงานในทีมเดียวกัน ทำงานได้เหมือนถูกจ่ายงานแต่ไม่ใช่เจ้าภาพการส่งตรวจ
/// </summary>
public enum TicketAssignmentRole
{
    Owner,
    Member
}
