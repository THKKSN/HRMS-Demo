using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Tickets.Dtos;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace Hrms.Application.Features.Tickets.Commands;

public class CreateTicketHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permService,
    IAuditLogService auditLog,
    ITicketRoutingService routingService,
    ITicketNumberGenerator ticketNumberGenerator) : IRequestHandler<CreateTicketCommand, TicketDto>
{
    public async Task<TicketDto> Handle(CreateTicketCommand request, CancellationToken ct)
    {
        var employeeId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

        if (!await permService.HasPermissionAsync(currentUser, "ticket:create", ct))
            throw new AppForbiddenException("ไม่มีสิทธิ์: ticket:create");

        if (string.IsNullOrWhiteSpace(request.Detail))
            throw new FluentValidation.ValidationException("กรุณาระบุรายละเอียดปัญหา");

        var employee = await db.Employees
            .Include(e => e.Company)
            .Include(e => e.Department)
            .FirstOrDefaultAsync(e => e.Id == employeeId && e.IsActive, ct)
            ?? throw new AppUnauthorizedException("EMPLOYEE_NOT_FOUND");

        var targetDepartment = await db.Departments
            .Include(d => d.Company)
            .Include(d => d.ManagerEmployee)
            .FirstOrDefaultAsync(d =>
                d.Id == request.TargetDepartmentId &&
                d.CompanyId == request.TargetCompanyId &&
                d.IsActive &&
                d.Company.IsActive, ct)
            ?? throw new FluentValidation.ValidationException("ไม่พบแผนกปลายทางที่ระบุ");

        var category = await db.TicketCategories
            .FirstOrDefaultAsync(c =>
                c.Id == request.CategoryId &&
                c.CompanyId == request.TargetCompanyId &&
                c.DepartmentId == request.TargetDepartmentId &&
                c.IsActive, ct)
            ?? throw new FluentValidation.ValidationException("ไม่พบหมวดเรื่องที่ระบุ");

        var topic = await db.TicketTopics
            .FirstOrDefaultAsync(t =>
                t.Id == request.TopicId &&
                t.CategoryId == request.CategoryId &&
                t.CompanyId == request.TargetCompanyId &&
                t.DepartmentId == request.TargetDepartmentId &&
                t.IsActive, ct)
            ?? throw new FluentValidation.ValidationException("ไม่พบหัวข้อย่อยที่ระบุ");

        var subject = await db.TicketSubjects
            .FirstOrDefaultAsync(s =>
                s.Id == request.SubjectId &&
                s.TopicId == request.TopicId &&
                s.CategoryId == request.CategoryId &&
                s.CompanyId == request.TargetCompanyId &&
                s.DepartmentId == request.TargetDepartmentId &&
                s.IsActive, ct)
            ?? throw new FluentValidation.ValidationException("ไม่พบหัวข้อที่ระบุ");

        var otherTopicText = TrimOrNull(request.OtherTopicText);
        if (subject.Name.Trim().Equals("อื่น ๆ", StringComparison.OrdinalIgnoreCase) && otherTopicText is null)
            throw new FluentValidation.ValidationException("กรุณาระบุหัวข้ออื่น ๆ");

        var now = DateTime.UtcNow.AddHours(7);
        var uploadTokens = (request.AttachmentUrls ?? [])
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Select(ParseUploadId)
            .Distinct()
            .ToList();
        if (uploadTokens.Count > 10)
            throw new FluentValidation.ValidationException("แนบหลักฐานตอนเปิดเรื่องได้ไม่เกิน 10 ไฟล์");
        var pendingUploads = await db.TicketPendingUploads
            .Where(upload => uploadTokens.Contains(upload.Id) &&
                upload.UploadedByEmployeeId == employee.Id &&
                upload.LinkedAt == null)
            .ToListAsync(ct);
        if (pendingUploads.Count != uploadTokens.Count)
            throw new FluentValidation.ValidationException("ไฟล์อัปโหลดไม่ถูกต้อง ถูกใช้งานแล้ว หรือไม่ใช่ของผู้ใช้");

        var routing = await routingService.ResolveAsync(
            request.TargetCompanyId, request.TargetDepartmentId, request.CategoryId, request.TopicId,
            DateOnly.FromDateTime(now), ct);
        var resolvedGuidance = await TicketWorkflowRuntime.ResolveGuidanceAsync(
            db,
            request.TargetCompanyId,
            request.TargetDepartmentId,
            request.CategoryId,
            request.TopicId,
            subject.Id,
            ct);

        var ticket = new Ticket
        {
            TicketNo = await ticketNumberGenerator.NextAsync(DateOnly.FromDateTime(now), ct),
            RequestType = request.RequestType,
            RequesterEmployeeId = employee.Id,
            SourceCompanyId = employee.CompanyId,
            SourceDepartmentId = employee.DepartmentId,
            TargetCompanyId = request.TargetCompanyId,
            TargetDepartmentId = request.TargetDepartmentId,
            CategoryId = request.CategoryId,
            TopicId = request.TopicId,
            SubjectId = subject.Id,
            WorkflowDefinitionId = resolvedGuidance?.Workflow?.WorkflowDefinitionId,
            SubjectGuidanceConfigId = resolvedGuidance?.GuidanceConfigId,
            OtherTopicText = otherTopicText,
            Title = subject.Name.Trim(),
            Detail = request.Detail.Trim(),
            WorkflowName = resolvedGuidance?.Workflow?.Name,
            WorkflowBoardStepsJson = resolvedGuidance?.Workflow is null ? null : JsonSerializer.Serialize(resolvedGuidance.Workflow.BoardSteps),
            WorkflowInProgressPresetsJson = resolvedGuidance?.Workflow is null ? null : JsonSerializer.Serialize(resolvedGuidance.Workflow.InProgressPresets),
            WorkflowActionsJson = resolvedGuidance?.Workflow is null ? null : JsonSerializer.Serialize(resolvedGuidance.Workflow.Actions),
            WorkflowStepsJson = resolvedGuidance?.Workflow is null ? null : System.Text.Json.JsonSerializer.Serialize(resolvedGuidance.Workflow.Steps),
            WorkflowStatusStepMapJson = resolvedGuidance?.Workflow is null ? null : System.Text.Json.JsonSerializer.Serialize(resolvedGuidance.Workflow.CurrentStepIndexByStatus),
            WorkflowAutoAcknowledgeAfterDays = resolvedGuidance?.Workflow?.AutoAcknowledgeAfterDays,
            WorkflowCurrentStepKey = resolvedGuidance?.Workflow?.BoardSteps.FirstOrDefault()?.Key,
            SubjectGuidanceConfigName = resolvedGuidance?.GuidanceConfigName,
            Priority = request.Priority,
            Status = TicketStatus.Open,
            RoutingMode = routing.Mode,
            RoutingLevel = routing.Level,
            RoutingOutcome = routing.Outcome,
            VehicleText = TrimOrNull(request.VehicleText),
            LocationText = TrimOrNull(request.LocationText),
            ContactPhone = TrimOrNull(request.ContactPhone ?? employee.Phone),
            ContactNote = TrimOrNull(request.ContactNote),
            ReceiverEmployeeId = targetDepartment.ManagerEmployeeId
        };

        foreach (var upload in pendingUploads)
        {
            var attachment = new TicketAttachment
            {
                UploadedByEmployeeId = employee.Id,
                FileName = upload.FileName,
                ContentType = upload.ContentType,
                SizeBytes = upload.SizeBytes,
                StorageKey = upload.StorageKey,
                Stage = TicketAttachmentStage.Created,
                Visibility = TicketAttachmentVisibility.Public
            };
            attachment.Url = ContentUrl(ticket.Id, attachment.Id);
            ticket.Attachments.Add(attachment);
            upload.LinkedAt = now;
            upload.TicketAttachmentId = attachment.Id;
        }

        db.Tickets.Add(ticket);
        TicketStatusTransition.Record(
            db, ticket, null, TicketStatus.Open, employee.Id, ticket.CreatedAt, "TicketCreated");
        TicketAssignment? autoAssignment = null;
        var autoCandidate = routing.Outcome == TicketRoutingOutcome.AutoAssigned
            ? routing.Candidates.Single()
            : null;
        if (autoCandidate is not null)
        {
            autoAssignment = new TicketAssignment
            {
                TicketId = ticket.Id,
                AssignedToEmployeeId = autoCandidate.EmployeeId,
                AssignedByEmployeeId = null,
                AssignedAt = now,
                IsPrimary = true,
                IsActive = true,
                ActiveSlot = "Primary",
                Note = routing.Level == TicketRoutingLevel.Topic
                    ? "Auto assigned from topic responsibility"
                    : "Auto assigned from category responsibility",
                AssignmentSource = routing.Level == TicketRoutingLevel.Topic
                    ? TicketAssignmentSource.AutoTopic
                    : TicketAssignmentSource.AutoCategory,
                ResponsibilityId = autoCandidate.ResponsibilityId,
                RoutingLevelSnapshot = routing.Level
            };
            db.TicketAssignments.Add(autoAssignment);
            ticket.Status = TicketStatus.Assigned;
            TicketStatusTransition.Record(db, ticket, TicketStatus.Open, TicketStatus.Assigned,
                null, now, autoAssignment.AssignmentSource.ToString(), autoAssignment.Id);
        }

        QueueRoutingNotifications(ticket, employee, targetDepartment, category, topic, routing);
        await db.ExecuteInTransactionAsync(async transactionCt =>
        {
            await db.SaveChangesAsync(transactionCt);
            await auditLog.LogAsync(
                "ticket", "Ticket", ticket.Id.ToString(), "create",
                $"{employee.FirstName} {employee.LastName} เปิดใบแจ้งเรื่อง {ticket.TicketNo}: {ticket.Title}",
                null, new { ticket.TicketNo, ticket.TargetCompanyId, ticket.TargetDepartmentId,
                    ticket.CategoryId, ticket.TopicId, ticket.SubjectId, ticket.Priority, ticket.Status,
                    routing.Level, routing.Mode, routing.Outcome }, transactionCt);
            var routingAction = routing.Outcome switch
            {
                TicketRoutingOutcome.AutoAssigned when routing.Level == TicketRoutingLevel.Topic => "auto-route-topic",
                TicketRoutingOutcome.AutoAssigned => "auto-route-category",
                TicketRoutingOutcome.SupervisorQueue => "routing-multiple-candidates",
                _ => "routing-no-match"
            };
            await auditLog.LogAsync("ticket", "Ticket", ticket.Id.ToString(), routingAction,
                $"Routing {ticket.TicketNo}: {routing.Outcome}", null,
                new { routing.Level, routing.Mode, routing.Outcome,
                    CandidateIds = routing.Candidates.Select(c => c.EmployeeId), AssignmentId = autoAssignment?.Id }, transactionCt);
        }, ct);

        return new TicketDto(
            ticket.Id,
            ticket.TicketNo,
            ticket.RequestType,
            employee.Id,
            $"{employee.FirstName} {employee.LastName}".Trim(),
            employee.CompanyId,
            employee.DepartmentId,
            targetDepartment.CompanyId,
            targetDepartment.Company.Name,
            targetDepartment.Id,
            targetDepartment.Name,
            category.Id,
            category.Name,
            topic.Id,
            topic.Name,
            subject.Id,
            subject.Name,
            ticket.OtherTopicText,
            ticket.Title,
            ticket.Detail,
            ticket.Priority,
            ticket.Status,
            ticket.WorkflowDefinitionId,
            ticket.WorkflowName,
            ticket.WorkflowAutoAcknowledgeAfterDays,
            resolvedGuidance?.Workflow?.Steps ?? [],
            resolvedGuidance?.Workflow?.CurrentStepIndexByStatus ?? new Dictionary<TicketStatus, int>(),
            ticket.SubjectGuidanceConfigId,
            ticket.SubjectGuidanceConfigName,
            ticket.VehicleText,
            ticket.LocationText,
            ticket.ContactPhone,
            ticket.ContactNote,
            ticket.Attachments.Select(a => new TicketAttachmentDto(
                a.Id, a.TicketProgressEntryId, a.Url, a.FileName, a.ContentType, a.SizeBytes, a.Stage, a.Visibility)).ToList(),
            ticket.CreatedAt,
            new TicketRoutingSummaryDto(routing.Mode, routing.Level, routing.Outcome,
                autoCandidate?.EmployeeId, autoCandidate?.EmployeeName));
    }

    private static Guid ParseUploadId(string value)
    {
        const string prefix = "ticket-upload:";
        var token = value.Trim();
        if (!token.StartsWith(prefix, StringComparison.OrdinalIgnoreCase) ||
            !Guid.TryParse(token[prefix.Length..], out var uploadId))
            throw new FluentValidation.ValidationException("ไฟล์แนบต้องอัปโหลดผ่านระบบ Ticket");
        return uploadId;
    }

    private static string ContentUrl(Guid ticketId, Guid attachmentId)
        => $"/tickets/{ticketId}/attachments/{attachmentId}/content";

    private void QueueRoutingNotifications(
        Ticket ticket,
        Employee requester,
        Department targetDepartment,
        TicketCategory category,
        TicketTopic topic,
        TicketRoutingResult routing)
    {
        var managerLineUserId = targetDepartment.ManagerEmployee?.LineUserId;
        var requesterName = $"{requester.FirstName} {requester.LastName}".Trim();
        var message =
            $"มีใบแจ้งเรื่องใหม่ {ticket.TicketNo}\n" +
            $"หัวข้อ: {ticket.Title}\n" +
            $"จาก: {requesterName}\n" +
            $"ปลายทาง: {targetDepartment.Name}\n" +
            $"หมวด: {category.Name} / {topic.Name}\n" +
            $"สถานที่: {ticket.LocationText ?? "-"}\n" +
            $"ความเร่งด่วน: {PriorityLabel(ticket.Priority)}\n" +
            $"การกระจายงาน: {RoutingOutcomeLabel(routing.Outcome)}";
        var sent = new HashSet<string>(StringComparer.Ordinal);
        if (!string.IsNullOrWhiteSpace(managerLineUserId))
        {
            sent.Add(managerLineUserId);
            TicketCommandSupport.QueueNotification(
                db, "TicketCreated", ticket.Id, targetDepartment.ManagerEmployeeId,
                managerLineUserId, message, ticket);
        }
        foreach (var candidate in routing.Candidates)
        {
            if (string.IsNullOrWhiteSpace(candidate.LineUserId) || !sent.Add(candidate.LineUserId)) continue;
            var candidateMessage = routing.Outcome == TicketRoutingOutcome.AutoAssigned
                ? $"คุณได้รับมอบหมายงาน {ticket.TicketNo}\nเรื่อง: {ticket.Title}\nหัวข้อ: {category.Name} / {topic.Name}"
                : $"มีงานใหม่ในขอบเขตที่คุณรับผิดชอบ {ticket.TicketNo}\nเรื่อง: {ticket.Title}\nคุณสามารถเปิด LIFF เพื่อรับงานนี้ได้";
            TicketCommandSupport.QueueNotification(
                db, routing.Outcome == TicketRoutingOutcome.AutoAssigned
                    ? "TicketAssigned"
                    : "TicketCreated",
                ticket.Id, candidate.EmployeeId, candidate.LineUserId, candidateMessage, ticket);
        }
        if (routing.Outcome == TicketRoutingOutcome.AutoAssigned)
            TicketCommandSupport.QueueNotification(
                db, "TicketAssigned", ticket.Id, requester.Id, requester.LineUserId,
                $"ใบแจ้งเรื่อง {ticket.TicketNo} ได้รับการมอบหมายแล้ว\nผู้รับผิดชอบ: {routing.Candidates[0].EmployeeName}",
                ticket);
    }

    private static string? TrimOrNull(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string PriorityLabel(TicketPriority priority) => priority switch
    {
        TicketPriority.Low => "ปกติ",
        TicketPriority.Medium => "กลาง",
        TicketPriority.High => "ด่วน",
        TicketPriority.Critical => "ด่วนมาก",
        _ => priority.ToString()
    };

    private static string RoutingOutcomeLabel(TicketRoutingOutcome outcome) => outcome switch
    {
        TicketRoutingOutcome.NoMatch => "ยังไม่พบผู้รับผิดชอบ",
        TicketRoutingOutcome.SupervisorQueue => "ส่งเข้าคิวผู้รับผิดชอบ",
        TicketRoutingOutcome.AutoAssigned => "มอบหมายอัตโนมัติ",
        _ => "กำลังตรวจสอบ"
    };
}
