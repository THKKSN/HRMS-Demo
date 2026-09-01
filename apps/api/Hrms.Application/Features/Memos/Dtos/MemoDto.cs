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
    DateTime? RejectedAt,
    string? RejectReason,
    DateTime? AcknowledgedAt,
    string? AcknowledgedByName,
    DateTime? DeliveredAt,
    string? DeliveredByName,
    DateTime? ReceivedAt,
    string? ReceivedByName,
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
