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

    public static TicketRequesterContext Requester(Ticket ticket)
        => new TicketRequesterResolver().FromTicket(ticket);

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
        TicketRequesterContext requester,
        string message,
        Ticket ticket)
        => QueueNotification(
            db,
            eventType,
            occurrenceId,
            requester.EmployeeId,
            requester.LineUserId,
            message,
            ticket);

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
        var deduplicationKey = $"{eventType}:{ticket.Id:N}:{occurrenceId:N}:{recipientKey}";
        // ผู้รับซ้ำใน occurrence เดียวกัน (เช่น ผู้แจ้งเป็นหัวหน้าแผนกปลายทางเอง หรือ assignee เป็นผู้แจ้งเอง)
        // — DeduplicationKey เป็น unique index ถ้าปล่อย insert ซ้ำจะพัง SaveChanges ทั้งก้อน
        if (db.NotificationOutboxes.Local.Any(n => n.DeduplicationKey == deduplicationKey)) return;
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
            DeduplicationKey = deduplicationKey,
            Status = NotificationDeliveryStatus.Pending
        });
    }

    private sealed record TicketNotificationPayload(string Message);

    public static void QueueExternalRepairSync(
        IApplicationDbContext db,
        Ticket ticket,
        Company targetCompany,
        Department targetDepartment,
        TicketCategory category,
        TicketTopic topic,
        TicketSubject subject)
    {
        var payload = new ExternalRepairSyncPayload(
            ticket.TicketNo,
            ticket.CreatedAt,
            targetCompany.Name,
            targetDepartment.Name,
            category.Name,
            topic.Name,
            subject.Name,
            ticket.OtherTopicText,
            ticket.Title,
            ticket.Detail,
            ticket.Priority.ToString(),
            ticket.VehicleText,
            ticket.LocationText,
            ticket.ContactPhone,
            ticket.ContactNote,
            ticket.RequesterNameSnapshot,
            ticket.RequesterPhoneSnapshot);
        db.ExternalRepairSyncOutboxes.Add(new ExternalRepairSyncOutbox
        {
            TicketId = ticket.Id,
            PayloadJson = JsonSerializer.Serialize(payload),
            DeduplicationKey = $"TicketCreated:{ticket.Id:N}",
            Status = NotificationDeliveryStatus.Pending
        });
    }

    private sealed record ExternalRepairSyncPayload(
        string TicketNo,
        DateTime CreatedAt,
        string CompanyName,
        string DepartmentName,
        string CategoryName,
        string TopicName,
        string SubjectName,
        string? OtherTopicText,
        string Title,
        string Detail,
        string Priority,
        string? VehicleText,
        string? LocationText,
        string? ContactPhone,
        string? ContactNote,
        string? RequesterName,
        string? RequesterPhone);
}
