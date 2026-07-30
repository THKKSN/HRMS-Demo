using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;

namespace Hrms.Application.Features.Tickets;

internal static class TicketStatusTransition
{
    public static void Record(
        IApplicationDbContext db,
        Ticket ticket,
        TicketStatus? fromStatus,
        TicketStatus toStatus,
        Guid? changedByEmployeeId,
        DateTime changedAt,
        string? reason = null,
        Guid? assignmentId = null)
    {
        db.TicketStatusHistory.Add(new TicketStatusHistory
        {
            TicketId = ticket.Id,
            FromStatus = fromStatus,
            ToStatus = toStatus,
            ChangedByEmployeeId = changedByEmployeeId,
            ChangedAt = changedAt,
            Reason = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim(),
            AssignmentId = assignmentId,
            CreatedBy = changedByEmployeeId,
            UpdatedBy = changedByEmployeeId
        });
    }
}
