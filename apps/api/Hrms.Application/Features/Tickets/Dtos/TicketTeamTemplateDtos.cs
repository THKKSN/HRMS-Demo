namespace Hrms.Application.Features.Tickets.Dtos;

/// <summary>ทีมสำเร็จรูประดับบริษัท (หน้าตั้งค่า)</summary>
public record TicketTeamTemplateDto(
    Guid Id,
    Guid CompanyId,
    Guid? DepartmentId,
    string? DepartmentName,
    string Name,
    string? Description,
    bool IsActive,
    int SortOrder,
    IReadOnlyList<TicketTeamTemplateMemberDto> Members);

public record TicketTeamTemplateMemberDto(
    Guid EmployeeId,
    string EmployeeName,
    string? EmployeeCode,
    string? DepartmentName,
    bool IsActiveEmployee);

/// <summary>ตัวเลือกทีมสำเร็จรูปที่ใช้กับใบแจ้งเรื่องหนึ่งใบได้ (กรอง scope + คนที่ยังไม่อยู่ในทีมแล้ว)</summary>
public record TicketTeamTemplateOptionDto(
    Guid Id,
    string Name,
    string? Description,
    bool IsCompanyWide,
    int MemberCount,
    /// <summary>จำนวนคนที่จะถูกเพิ่มจริงถ้ากดดึงทีมนี้ (ตัดคนที่อยู่ในทีมแล้วออก)</summary>
    int AddableCount);
