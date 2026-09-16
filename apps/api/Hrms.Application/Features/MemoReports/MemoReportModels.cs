namespace Hrms.Application.Features.MemoReports;

// ตัวกรองภาพรวม Memo — ใช้ชุดเดียวกับแถบกรองของ "ภาพรวมการแจ้งเรื่อง" บน dashboard
// CompanyId = บริษัทปลายทางที่รับเรื่อง (MemoType.CompanyId) ให้ความหมายตรงกับ ticket ที่กรองด้วย TargetCompanyId
public record MemoReportFilter(DateOnly? DateFrom, DateOnly? DateTo, Guid? CompanyId);

// AppliedScope: All (Admin/Executive) · SupervisorScope (เห็นเฉพาะแผนกปลายทางของตัวเอง)
public record MemoReportMetaDto(DateOnly DateFrom, DateOnly DateTo, string Timezone, string AppliedScope);

// หนึ่งแถว = หนึ่ง "หัวข้อ Memo" — ประเภทเรื่อง + หมวด/หมวดย่อยตาม snapshot ตอนสร้างเรื่อง
// ชื่อประเภท memo / บริษัท / แผนก ส่งครบ 3 ภาษา (i18n Phase M) — หน้าจอเลือกด้วย localizedName
// ส่วน CategoryName/SubCategoryName เป็น snapshot ตอนสร้างเรื่อง จึงคงภาษาไทยตามกติกา snapshot (ไม่แปลย้อนหลัง)
public record MemoTopicItemDto(
    Guid MemoTypeId,
    string MemoTypeName,
    string CategoryName,
    string SubCategoryName,
    string TargetCompanyName,
    string TargetDepartmentName,
    int TotalCount,
    int PendingCount,
    int InProgressCount,
    int CompletedCount,
    int RejectedCount,
    string? MemoTypeNameEn = null, string? MemoTypeNameId = null,
    string? TargetCompanyNameEn = null, string? TargetCompanyNameId = null,
    string? TargetDepartmentNameEn = null, string? TargetDepartmentNameId = null);

// นับตามสถานะจริงของเรื่อง:
// Pending = รออนุมัติ · InProgress = อนุมัติแล้วแต่ยังไม่ตรวจรับ · Completed = ตรวจรับแล้ว · Rejected = ไม่อนุมัติ
public record MemoOverviewDto(
    int TotalCount,
    int PendingCount,
    int InProgressCount,
    int CompletedCount,
    int RejectedCount,
    IReadOnlyList<MemoTopicItemDto> TopTopics,
    MemoReportMetaDto Meta);
