using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using System.Text.Json;

namespace Hrms.Application.Features.Tickets;

internal static class TicketCommandSupport
{
    public static void EnsureExpectedVersion(Ticket ticket, DateTime? expectedUpdatedAt)
    {
        if (expectedUpdatedAt.HasValue && ticket.UpdatedAt != expectedUpdatedAt.Value)
            throw new ConflictException("TICKET_CHANGED", "ใบแจ้งเรื่องถูกแก้ไขโดยผู้ใช้อื่น กรุณาโหลดข้อมูลใหม่");
    }

    public static string FullName(Employee employee)
        => $"{employee.FirstName} {employee.LastName}".Trim();

    public static void SetWorkflowBoardState(
        Ticket ticket,
        string workflowStepKey,
        string? workState = null,
        string? blockerReason = null,
        string? nextAction = null)
    {
        ticket.WorkflowCurrentStepKey = workflowStepKey;
        ticket.CurrentWorkState = string.IsNullOrWhiteSpace(workState) ? null : workState.Trim();
        ticket.CurrentBlockerReason = string.IsNullOrWhiteSpace(blockerReason) ? null : blockerReason.Trim();
        ticket.CurrentNextAction = string.IsNullOrWhiteSpace(nextAction) ? null : nextAction.Trim();
    }

    public static TicketProgressEntry AddProgressEntry(
        IApplicationDbContext db,
        Ticket ticket,
        Guid createdByEmployeeId,
        string workflowStepKey,
        string? workState = null,
        string? blockerReason = null,
        string? nextAction = null,
        string? note = null,
        Guid? ownerEmployeeId = null,
        DateTime? dueAt = null,
        bool isCompleted = false)
    {
        var entry = new TicketProgressEntry
        {
            TicketId = ticket.Id,
            WorkflowStepKey = workflowStepKey,
            WorkState = string.IsNullOrWhiteSpace(workState) ? null : workState.Trim(),
            BlockerReason = string.IsNullOrWhiteSpace(blockerReason) ? null : blockerReason.Trim(),
            NextAction = string.IsNullOrWhiteSpace(nextAction) ? null : nextAction.Trim(),
            IsCompleted = isCompleted,
            Note = string.IsNullOrWhiteSpace(note) ? null : note.Trim(),
            OwnerEmployeeId = ownerEmployeeId,
            DueAt = dueAt,
            CreatedByEmployeeId = createdByEmployeeId,
            CreatedBy = createdByEmployeeId,
            UpdatedBy = createdByEmployeeId
        };
        db.TicketProgressEntries.Add(entry);
        return entry;
    }

    public static void QueueNotification(
        IApplicationDbContext db,
        string eventType,
        Guid occurrenceId,
        Guid? recipientEmployeeId,
        string? lineUserId,
        string message,
        Ticket ticket)
    {
        if (string.IsNullOrWhiteSpace(lineUserId)) return;
        var recipientKey = recipientEmployeeId?.ToString("N") ?? lineUserId;
        db.NotificationOutboxes.Add(new NotificationOutbox
        {
            Channel = NotificationChannel.Line,
            RecipientEmployeeId = recipientEmployeeId,
            LineUserId = lineUserId,
            EventType = eventType,
            EntityType = "Ticket",
            EntityId = ticket.Id,
            EntityReference = ticket.TicketNo,
            PayloadJson = JsonSerializer.Serialize(new TicketNotificationPayload(message)),
            DeduplicationKey = $"{eventType}:{ticket.Id:N}:{occurrenceId:N}:{recipientKey}",
            Status = NotificationDeliveryStatus.Pending
        });
    }

    private sealed record TicketNotificationPayload(string Message);
}
