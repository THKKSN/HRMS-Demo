using Hrms.Domain.Enums;

namespace Hrms.Application.Features.Tickets.Dtos;

public record TicketAttachmentDto(
    Guid Id,
    Guid? TicketProgressEntryId,
    string Url,
    string? FileName,
    string? ContentType,
    long SizeBytes,
    TicketAttachmentStage Stage,
    TicketAttachmentVisibility Visibility);
