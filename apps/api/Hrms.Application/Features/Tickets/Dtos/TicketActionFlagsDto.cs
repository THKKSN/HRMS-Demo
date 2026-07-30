namespace Hrms.Application.Features.Tickets.Dtos;

public record TicketActionFlagsDto(
    bool IsRequester,
    bool IsReceiverSide,
    bool CanAccept,
    bool CanTriage,
    bool CanAssign,
    bool CanReject,
    bool CanStart,
    bool CanEditWorkDetail,
    bool CanRequestInfo,
    bool CanResume,
    bool CanResolve,
    bool CanComment,
    bool CanAddInternalNote,
    bool CanAddAttachment,
    bool CanAddWorkAttachment,
    bool CanReturnForRevision,
    bool CanClose,
    bool CanViewTicketReport,
    bool CanClaim,
    bool CanRequestCancellation);
