namespace Hrms.Application.Features.Tickets.Dtos;

// ตัวเลขงานคงค้างของผู้เรียก — field ที่ผู้เรียกไม่มีสิทธิ์เห็นจะเป็น null (ไม่ใช่ 0)
public record TicketPendingCountsDto(
    int? AssignedActive,
    int? AssignedWaitingInfo,
    int? Claimable,
    int? MyOpen,
    int? AwaitingMyConfirmation,
    int? InboxUntriaged,
    int? CancellationPending,
    int? MemoAwaitingAck,
    int? MemoAwaitingApproval);
