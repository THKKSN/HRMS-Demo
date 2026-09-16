using Hrms.Domain.Enums;

namespace Hrms.Application.Features.Tickets.Dtos;

/// <summary>
/// สมาชิก 1 คนในทีมของใบแจ้งเรื่อง (มาจากตาราง ticket_assignments แถวที่ยัง active)
/// Owner = ผู้รับผิดชอบหลัก · Member = ผู้ร่วมงาน
/// </summary>
public record TicketTeamMemberDto(
    Guid AssignmentId,
    Guid EmployeeId,
    string EmployeeName,
    string? EmployeeCode,
    string? DepartmentName,
    TicketAssignmentRole MemberRole,
    DateTime AssignedAt,
    Guid? AssignedByEmployeeId,
    string? AssignedByEmployeeName,
    string? Note,
    /// <summary>ถอนคนนี้ออกจากทีมได้หรือไม่ — ผู้รับผิดชอบหลักถอนไม่ได้ ต้องใช้เมนูเปลี่ยนผู้รับผิดชอบ</summary>
    bool CanRemove);
