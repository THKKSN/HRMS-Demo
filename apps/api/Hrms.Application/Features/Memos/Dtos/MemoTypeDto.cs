using Hrms.Domain.Enums;

namespace Hrms.Application.Features.Memos.Dtos;

// ฟิลด์ FirstApprover* เป็น optional ท้าย record — call site เดิม compile ผ่านโดยได้ default Executive/pool
public record MemoTypeDto(
    Guid Id,
    string Name,
    Guid CompanyId,
    string CompanyName,
    Guid DepartmentId,
    string DepartmentName,
    bool IsActive,
    RoleType FirstApproverRoleCode = RoleType.Executive,
    Guid? FirstApproverEmployeeId = null,
    string? FirstApproverEmployeeName = null,
    string? NameEn = null,
    string? NameId = null,
    // ชื่อบริษัท/แผนกปลายทางอีก 2 ภาษา — หน้า settings เลือกด้วย localizedName()
    string? CompanyNameEn = null,
    string? CompanyNameId = null,
    string? DepartmentNameEn = null,
    string? DepartmentNameId = null);

// ขั้นตอนทำงานหลังรับทราบ (definition ต่อ MemoType) — จัดการผ่านหน้า settings
public record MemoWorkflowStepDto(
    Guid Id,
    Guid MemoTypeId,
    int SortOrder,
    string Label,
    MemoStepKind StepKind,
    RoleType AssigneeRoleCode,
    Guid? AssigneeEmployeeId,
    string? AssigneeEmployeeName,
    bool IsActive);
