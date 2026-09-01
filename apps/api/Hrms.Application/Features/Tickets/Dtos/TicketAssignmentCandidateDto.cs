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
    bool IsInTargetDepartment);
