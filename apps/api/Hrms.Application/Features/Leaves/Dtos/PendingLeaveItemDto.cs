using Hrms.Domain.Enums;

namespace Hrms.Application.Features.Leaves.Dtos;

public record PendingLeaveItemDto(
    Guid Id,
    string EmployeeName,
    string LeaveTypeName,
    DateOnly DateFrom,
    DateOnly DateTo,
    decimal TotalDays,
    LeaveStatus Status,
    DateTime CreatedAt,
    // ชื่อประเภทการลาอีก 2 ภาษา — หน้าจอเลือกด้วย localizedName() ตามภาษาที่ผู้ใช้เลือก
    string? LeaveTypeNameEn = null,
    string? LeaveTypeNameId = null);
