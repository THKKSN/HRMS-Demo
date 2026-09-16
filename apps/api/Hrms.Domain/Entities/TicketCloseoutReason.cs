using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// Master "ประเภทปัญหา/เหตุผลปิดงาน" ที่ผู้รับผิดชอบเลือกตอนส่งงานให้ตรวจ — แทน enum TicketProblemType เดิม
/// scope: บริษัท (บังคับ) + แผนก (ว่าง = ใช้ได้ทั้งบริษัท เป็น fallback ให้ ticket ที่ยังไม่ผูกแผนก เช่นใบแจ้งจากภายนอก)
/// ผูกกับหมวด (TicketCategory) แบบเลือกได้ผ่าน <see cref="Categories"/> — ไม่ผูกเลย = ใช้ได้ทุกหมวดใน scope นั้น
/// </summary>
public class TicketCloseoutReason : BaseEntity
{
    /// <summary>kind เริ่มต้น — เผื่อแยกมิติ "สาเหตุ" กับ "ผลการปิดงาน" ในอนาคตโดยไม่ต้องเพิ่มตาราง</summary>
    public const string ProblemTypeKind = "problem_type";

    public Guid CompanyId { get; set; }
    public Guid? DepartmentId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? NameEn { get; set; }
    public string? NameId { get; set; }
    public string? Description { get; set; }
    public string Kind { get; set; } = ProblemTypeKind;
    /// <summary>ค่า enum TicketProblemType เดิมที่แถวนี้ใช้แทน (เฉพาะ 3 แถว default ที่ migration seed ให้) ใช้ backfill และ sync column problem_type</summary>
    public string? LegacyProblemType { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
    /// <summary>ต้องกรอกรายละเอียดการแก้ไขก่อนส่งงาน/ปิดงานหรือไม่ — ปิดได้สำหรับเหตุผลที่ปิดจบได้เลย</summary>
    public bool RequiresResolutionNote { get; set; } = true;
    /// <summary>ต้องแนบรูปหลักฐานหลังทำก่อนส่งงาน/ปิดงานหรือไม่ — ปิดได้สำหรับเหตุผลอย่าง "ไม่พบปัญหา"</summary>
    public bool RequiresCompletionEvidence { get; set; } = true;
    public Guid? CreatedByEmployeeId { get; set; }

    public Company Company { get; set; } = null!;
    public Department? Department { get; set; }
    public Employee? CreatedByEmployee { get; set; }
    public ICollection<TicketCloseoutReasonCategory> Categories { get; set; } = new List<TicketCloseoutReasonCategory>();
}
