namespace Hrms.Application.Features.Tickets.Dtos;

/// <summary>แถว master สำหรับหน้าตั้งค่า — DepartmentId ว่าง = ใช้ได้ทั้งบริษัท, CategoryIds ว่าง = ใช้ได้ทุกหมวด</summary>
public record TicketCloseoutReasonDto(
    Guid Id,
    Guid CompanyId,
    Guid? DepartmentId,
    string Name,
    string? Description,
    string Kind,
    string? LegacyProblemType,
    int SortOrder,
    bool IsActive,
    IReadOnlyList<Guid> CategoryIds,
    bool RequiresResolutionNote,
    bool RequiresCompletionEvidence,
    string? NameEn = null,
    string? NameId = null);

/// <summary>
/// ตัวเลือกที่ผู้รับผิดชอบเห็นตอนปิดงานของ ticket ใบหนึ่ง (กรองตาม scope แผนก/หมวดแล้ว)
/// IsLegacySelection = เป็นค่าที่ ticket เลือกไว้แล้วแต่ตอนนี้ปิดใช้งาน/หลุด scope — โชว์ให้เห็นแต่ไม่ควรให้เลือกใหม่
/// RequiresResolutionNote / RequiresCompletionEvidence บอกฟอร์มว่าช่องไหนบังคับสำหรับเหตุผลนี้
/// </summary>
public record TicketCloseoutReasonOptionDto(
    Guid Id,
    string Name,
    string? Description,
    bool IsCompanyWide,
    bool IsLegacySelection,
    bool RequiresResolutionNote,
    bool RequiresCompletionEvidence,
    string? NameEn = null,
    string? NameId = null);
