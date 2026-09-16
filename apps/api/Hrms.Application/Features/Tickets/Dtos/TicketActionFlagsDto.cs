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
    bool CanRequestCancellation,
    /// <summary>ผู้รับผิดชอบหลักของใบนี้ (แถว assignment ที่ IsPrimary และยัง active)</summary>
    bool IsTeamOwner,
    /// <summary>ผู้ร่วมงานที่ถูกดึงเข้าทีมของใบนี้</summary>
    bool IsTeamMember,
    /// <summary>เพิ่ม/ถอดผู้ร่วมงานได้ (หัวหน้าแผนกปลายทาง หรือผู้รับผิดชอบหลัก + permission)</summary>
    bool CanManageTeam);
