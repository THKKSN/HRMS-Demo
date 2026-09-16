using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// ทีมสำเร็จรูประดับบริษัท — ชุดรายชื่อที่ดึงเข้าใบแจ้งเรื่องได้ในคลิกเดียว
/// scope: บริษัท (บังคับ) + แผนก (ว่าง = ใช้ได้ทั้งบริษัท)
/// **ไม่ใช่ตัวตัดสินสิทธิ์** — สิทธิ์ทำงานยังอ่านจาก ticket_assignments เท่านั้น
/// การแก้ template ภายหลังไม่กระทบทีมของใบที่ดึงไปแล้ว
/// </summary>
public class TicketTeamTemplate : BaseEntity
{
    public Guid CompanyId { get; set; }
    public Guid? DepartmentId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
    public Guid? CreatedByEmployeeId { get; set; }

    public Company Company { get; set; } = null!;
    public Department? Department { get; set; }
    public Employee? CreatedByEmployee { get; set; }
    public ICollection<TicketTeamTemplateMember> Members { get; set; } = new List<TicketTeamTemplateMember>();
}

/// <summary>สมาชิก 1 คนใน template — ลบออกจาก template ได้จริงเพราะเป็นแค่รายการอ้างอิง ไม่ใช่ประวัติการทำงาน</summary>
public class TicketTeamTemplateMember : BaseEntity
{
    public Guid TemplateId { get; set; }
    public Guid EmployeeId { get; set; }

    public TicketTeamTemplate Template { get; set; } = null!;
    public Employee Employee { get; set; } = null!;
}
