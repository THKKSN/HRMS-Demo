using Hrms.Domain.Enums;

namespace Hrms.Application.Features.Tickets.Dtos;

public record TicketCancellationRequestDto(
    Guid Id,
    Guid TicketId,
    string TicketNo,
    string TicketTitle,
    Guid? RequestedByEmployeeId,
    Guid? RequestedByExternalReporterId,
    string RequestedByEmployeeName,
    string Reason,
    TicketCancellationStatus Status,
    DateTime RequestedAt,
    Guid? ReviewedByEmployeeId,
    string? ReviewedByEmployeeName,
    DateTime? ReviewedAt,
    string? ReviewNote,
    Guid TargetCompanyId,
    string TargetCompanyName,
    Guid TargetDepartmentId,
    string TargetDepartmentName,
    TicketStatus TicketStatus,
    DateTime TicketUpdatedAt);
