using Hrms.Domain.Enums;

namespace Hrms.Application.Features.Memos.Dtos;

public record MemoDto(
    Guid Id,
    string MemoNo,
    Guid MemoTypeId,
    string MemoTypeName,
    Guid MemoCategoryId,
    string MemoCategoryNameSnapshot,
    Guid MemoSubCategoryId,
    string MemoSubCategoryNameSnapshot,
    string Detail,
    Guid RequesterId,
    string RequesterName,
    Guid CompanyId,
    string CompanyName,
    Guid DepartmentId,
    string DepartmentName,
    MemoStatus Status,
    DateTime? ApprovedAt,
    string? ApprovedByName,
    string? ApproveComment,
    DateTime? RejectedAt,
    string? RejectReason,
    DateTime? AcknowledgedAt,
    string? AcknowledgedByName,
    DateTime? DeliveredAt,
    string? DeliveredByName,
    DateTime? ReceivedAt,
    string? ReceivedByName,
    DateTime CreatedAt,
    // ฟิลด์ workflow ใหม่เป็น optional ท้าย record — call site ของ command เดิมไม่ต้องส่ง
    // (frontend refetch รายละเอียดผ่าน GetMemoByIdQuery ซึ่ง populate ครบเสมอ)
    RoleType FirstApproverRoleCode = RoleType.Executive,
    string? FirstApproverEmployeeName = null,
    IReadOnlyList<MemoStepInstanceDto>? Steps = null,
    IReadOnlyList<MemoAttachmentDto>? Attachments = null,
    IReadOnlyList<MemoActivityDto>? Activities = null,
    bool CanActOnCurrentStep = false,
    bool CanAddActivity = false,
    // เรื่องถูกขั้นอนุมัติตีกลับมาให้ผู้ขอแก้ไข — workflow หยุดรอจนผู้ขอกดส่งกลับ
    DateTime? ReturnedToRequesterAt = null,
    string? ReturnedToRequesterReason = null,
    bool CanResubmit = false);

// snapshot ขั้นตอนต่อเรื่อง — CanAct คำนวณจาก user ปัจจุบัน (เฉพาะ step ที่ Status = Current)
public record MemoStepInstanceDto(
    Guid Id,
    int SortOrder,
    string Label,
    MemoStepKind StepKind,
    MemoStepStatus Status,
    RoleType AssigneeRoleCode,
    Guid? AssigneeEmployeeId,
    string? AssigneeEmployeeName,
    DateTime? ActedAt,
    string? ActedByName,
    string? ActionNote,
    bool CanAct,
    // ย้อนขั้นได้หรือไม่ — เท่ากับ ReturnTargets มีอย่างน้อยหนึ่งรายการ (คงไว้เพื่อความเข้ากันได้ของ UI เดิม)
    bool CanReturn,
    // ปลายทางที่ย้อนได้ของขั้นนี้ ส่งมาเฉพาะขั้นที่เป็นคิวปัจจุบัน — server คำนวณให้ ไม่ให้ frontend เดากติกา
    IReadOnlyList<MemoReturnTargetDto>? ReturnTargets = null);

// ปลายทางของการย้อนขั้นตอน — StepInstanceId = null คือ "ผู้ขอ" ซึ่งอยู่ก่อนขั้นที่ 1 (SortOrder = 0)
public record MemoReturnTargetDto(
    Guid? StepInstanceId,
    string Label,
    int SortOrder);

public record MemoAttachmentDto(
    Guid Id,
    string Url,
    string? FileName,
    string? ContentType,
    long SizeBytes,
    Guid? MemoStepInstanceId,
    Guid? MemoActivityId,
    string? UploadedByName,
    DateTime CreatedAt);

public record MemoActivityDto(
    Guid Id,
    string Message,
    bool IsSystem,
    Guid? MemoStepInstanceId,
    string? StepLabel,
    string? AuthorName,
    DateTime CreatedAt,
    IReadOnlyList<MemoAttachmentDto> Attachments,
    // ผู้ที่กำลังดูแก้บันทึกใบนี้ได้หรือไม่ — คำนวณฝั่ง server ไม่ให้ frontend เดากติกาเอง
    bool CanEdit = false);

// ไฟล์ที่ upload ผ่าน /v1/uploads (module=memos) แล้วส่ง metadata มาผูกกับเรื่อง/step/activity
public record MemoAttachmentInput(
    string Url,
    string? FileName,
    string? ContentType,
    long SizeBytes,
    string? StorageKey);

// งานขั้นตอนที่รอ user ปัจจุบันดำเนินการ (หน้า memos/tasks)
public record MemoStepTaskDto(
    Guid MemoId,
    string MemoNo,
    string MemoTypeName,
    string MemoCategoryNameSnapshot,
    string MemoSubCategoryNameSnapshot,
    string RequesterName,
    Guid StepInstanceId,
    int StepSortOrder,
    string StepLabel,
    MemoStepKind StepKind,
    DateTime CreatedAt);

public record MemoListItemDto(
    Guid Id,
    string MemoNo,
    string MemoTypeName,
    string MemoCategoryNameSnapshot,
    string MemoSubCategoryNameSnapshot,
    MemoStatus Status,
    DateTime? AcknowledgedAt,
    DateTime? DeliveredAt,
    DateTime? ReceivedAt,
    DateTime CreatedAt);

// Memo ที่ส่งเข้าแผนกปลายทาง (MemoType.CompanyId/DepartmentId) — รวม Pending ให้แผนกเตรียมงานล่วงหน้า
public record MemoInboxItemDto(
    Guid Id,
    string MemoNo,
    string MemoTypeName,
    string MemoCategoryNameSnapshot,
    string MemoSubCategoryNameSnapshot,
    string Detail,
    Guid RequesterId,
    string RequesterName,
    string RequesterCompanyName,
    string RequesterDepartmentName,
    MemoStatus Status,
    DateTime? ApprovedAt,
    DateTime? AcknowledgedAt,
    string? AcknowledgedByName,
    DateTime? DeliveredAt,
    string? DeliveredByName,
    DateTime? ReceivedAt,
    DateTime CreatedAt);
