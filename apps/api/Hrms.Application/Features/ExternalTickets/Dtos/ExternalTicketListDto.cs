using Hrms.Domain.Enums;

namespace Hrms.Application.Features.ExternalTickets.Dtos;

public record ExternalTicketListItemDto(
    Guid Id,
    string TicketNo,
    string Title,
    TicketStatus Status,
    string? CategoryName,
    string? TopicName,
    string? SubjectName,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record ExternalTicketListDto(
    IReadOnlyList<ExternalTicketListItemDto> Items,
    int TotalCount,
    int Page,
    int PageSize);

public record ExternalTicketAttachmentDto(
    Guid Id,
    string Url,
    string? FileName,
    string? ContentType,
    long SizeBytes);

public record ExternalTicketDetailDto(
    Guid Id,
    string TicketNo,
    string Title,
    string Detail,
    TicketStatus Status,
    string? CategoryName,
    string? TopicName,
    string? SubjectName,
    string? LocationText,
    string? ContactPhone,
    string? ContactNote,
    string? ResolutionNote,
    // สำหรับแสดง station line ความคืบหน้าให้ผู้แจ้งภายนอกเห็น (default workflow — external ไม่มี workflow ต่อ subject)
    string? WorkflowCurrentStepKey,
    IReadOnlyList<ExternalTicketAttachmentDto> Attachments,
    DateTime CreatedAt,
    DateTime UpdatedAt);
