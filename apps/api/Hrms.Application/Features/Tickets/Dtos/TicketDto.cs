using Hrms.Domain.Enums;

namespace Hrms.Application.Features.Tickets.Dtos;

public record TicketDto(
    Guid Id,
    string TicketNo,
    TicketRequestType RequestType,
    Guid RequesterEmployeeId,
    string RequesterName,
    Guid SourceCompanyId,
    Guid? SourceDepartmentId,
    Guid TargetCompanyId,
    string TargetCompanyName,
    Guid TargetDepartmentId,
    string TargetDepartmentName,
    Guid CategoryId,
    string CategoryName,
    Guid TopicId,
    string TopicName,
    string? OtherTopicText,
    string Title,
    string Detail,
    TicketPriority Priority,
    TicketStatus Status,
    string? VehicleText,
    string? LocationText,
    string? ContactPhone,
    string? ContactNote,
    IReadOnlyList<TicketAttachmentDto> Attachments,
    DateTime CreatedAt,
    TicketRoutingSummaryDto RoutingResult);

public record TicketRoutingSummaryDto(
    TicketRoutingMode Mode,
    TicketRoutingLevel Level,
    TicketRoutingOutcome Outcome,
    Guid? AssigneeId,
    string? AssigneeName);
