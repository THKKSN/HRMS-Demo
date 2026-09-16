using Hrms.Domain.Enums;

namespace Hrms.Application.Features.Tickets.Dtos;

public record TicketAssignmentCandidateDto(
    Guid EmployeeId,
    string EmployeeCode,
    string EmployeeName,
    string? RoleLabelName,
    int ActiveTicketCount,
    bool IsRecommended,
    TicketRoutingLevel ResponsibilityLevel,
    string? DepartmentName,
    bool IsInTargetDepartment,
    /// <summary>งานที่กำลังร่วมทีมกับคนอื่น (ไม่ใช่ผู้รับผิดชอบหลัก) — ใช้ดูภาระงานจริงประกอบการจ่ายงาน</summary>
    int TeamTicketCount);
