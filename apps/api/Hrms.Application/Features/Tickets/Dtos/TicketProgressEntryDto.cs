namespace Hrms.Application.Features.Tickets.Dtos;

public record TicketProgressEntryDto(
    Guid Id,
    string WorkflowStepKey,
    string? WorkState,
    string? BlockerReason,
    string? NextAction,
    bool IsCompleted,
    string? Note,
    Guid? OwnerEmployeeId,
    string? OwnerEmployeeName,
    DateTime? DueAt,
    Guid? CreatedByEmployeeId,
    Guid? CreatedByExternalReporterId,
    string CreatedByEmployeeName,
    DateTime CreatedAt,
    IReadOnlyList<TicketAttachmentDto> Attachments);
