using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Notifications;
using Hrms.Application.Common.Options;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using System.Text.Json;

namespace Hrms.Application.Features.Tickets;

internal static class TicketCommandSupport
{
    /// <summary>step key ของการ์ดที่ผู้ใช้สร้าง/แก้เองระหว่างดำเนินงาน — การ์ดขั้นอื่นเป็นของระบบ ห้ามแก้</summary>
    public const string InProgressStepKey = "in_progress";

    public static void EnsureExpectedVersion(Ticket ticket, DateTime? expectedUpdatedAt)
    {
        if (expectedUpdatedAt.HasValue && ticket.UpdatedAt != expectedUpdatedAt.Value)
            throw new ConflictException("TICKET_CHANGED", "The ticket was changed by another user. Reload and try again.");
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
        string templateKey,
        object? parameters,
        Ticket ticket)
        => QueueNotification(
            db,
            eventType,
            occurrenceId,
            requester.EmployeeId,
            requester.LineUserId,
            templateKey,
            parameters,
            ticket);

    /// <param name="templateKey">คีย์ใน <c>packages/i18n/messages/&lt;locale&gt;/notifications.json</c></param>
    /// <param name="parameters">
    /// ตัวแปรของเทมเพลต เช่น <c>new { ticketNo = ticket.TicketNo }</c> — ค่าที่เป็น null/ว่าง
    /// จะทำให้บรรทัดนั้นในเทมเพลตหายไป (ดู <see cref="NotificationTemplate.Render"/>)
    /// </param>
    /// <param name="localizedParameters">
    /// ตัวแปรที่เป็นชื่อ master data ซึ่งมีหลายภาษา — สร้างด้วย <c>LocalizedName.AllLocales</c>
    /// </param>
    public static void QueueNotification(
        IApplicationDbContext db,
        string eventType,
        Guid occurrenceId,
        Guid? recipientEmployeeId,
        string? lineUserId,
        string templateKey,
        object? parameters,
        Ticket ticket,
        Dictionary<string, Dictionary<string, string>>? localizedParameters = null)
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
            PayloadJson = NotificationPayload
                .FromTemplate(templateKey, parameters, localizedParameters).ToJson(),
            DeduplicationKey = deduplicationKey,
            Status = NotificationDeliveryStatus.Pending
        });
    }

    /// <summary>
    /// ส่งข้อความเดียวถึงคนทำงานของใบนี้ — ทางเข้าเดียวของ fan-out ฝั่งทีม
    /// ผู้รับผิดชอบหลักได้ทุก event ส่วนผู้ร่วมงานได้เฉพาะ event ที่อยู่ใน
    /// <c>Ticket:TeamNotificationEvents</c> (คุมจำนวนข้อความ LINE ไม่ให้บานตามขนาดทีม)
    /// dedup key มี recipient อยู่แล้วจึงไม่ส่งซ้ำคนเดิมใน occurrence เดียวกัน
    /// </summary>
    /// <param name="excludeEmployeeId">ผู้ลงมือเอง ไม่ต้องแจ้งซ้ำ</param>
    public static async Task QueueForTeamAsync(
        IApplicationDbContext db,
        TicketOptions options,
        string eventType,
        Guid occurrenceId,
        Ticket ticket,
        string templateKey,
        object? parameters,
        CancellationToken ct,
        Guid? excludeEmployeeId = null)
    {
        var includeMembers = options.TeamNotificationEvents
            .Any(item => string.Equals(item, eventType, StringComparison.OrdinalIgnoreCase));
        var recipients = await TicketTeam.ActiveRecipientsAsync(db, ticket.Id, ct);
        foreach (var recipient in recipients)
        {
            if (!recipient.IsOwner && !includeMembers) continue;
            if (excludeEmployeeId.HasValue && recipient.EmployeeId == excludeEmployeeId.Value) continue;
            QueueNotification(
                db, eventType, occurrenceId, recipient.EmployeeId, recipient.LineUserId,
                templateKey, parameters, ticket);
        }
    }

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
