using Hrms.Application.Features.Tickets.Dtos;
using Hrms.Domain.Enums;
using MediatR;

namespace Hrms.Application.Features.Tickets.Commands;

public record CreateTicketCommand(
    TicketRequestType RequestType,
    Guid TargetCompanyId,
    Guid TargetDepartmentId,
    Guid CategoryId,
    Guid TopicId,
    string? OtherTopicText,
    string Title,
    string Detail,
    TicketPriority Priority,
    string? VehicleText,
    string? LocationText,
    string? ContactPhone,
    string? ContactNote,
    IReadOnlyList<string>? AttachmentUrls) : IRequest<TicketDto>;
