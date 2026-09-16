using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Tickets.Dtos;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Hrms.Application.Features.Tickets.Commands;

public record AddTicketAttachmentCommand(
    Guid TicketId,
    string Url,
    string? FileName,
    string? ContentType,
    long SizeBytes,
    TicketAttachmentStage Stage,
    TicketAttachmentVisibility Visibility,
    Guid? TicketProgressEntryId = null) : IRequest<TicketAttachmentDto>;

public class AddTicketAttachmentValidator : AbstractValidator<AddTicketAttachmentCommand>
{
    public AddTicketAttachmentValidator()
    {
        RuleFor(x => x.Url).NotEmpty().MaximumLength(500);
        RuleFor(x => x.FileName).MaximumLength(255);
        RuleFor(x => x.ContentType).MaximumLength(100);
        RuleFor(x => x.SizeBytes).GreaterThanOrEqualTo(0).LessThanOrEqualTo(10 * 1024 * 1024);
    }
}

public class AddTicketAttachmentHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissions,
    IAuditLogService auditLog)
    : IRequestHandler<AddTicketAttachmentCommand, TicketAttachmentDto>
{
    public async Task<TicketAttachmentDto> Handle(AddTicketAttachmentCommand request, CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permissions, "ticket:add-attachment", ct);
        var ticket = await db.Tickets.FirstOrDefaultAsync(t => t.Id == request.TicketId, ct)
            ?? throw new NotFoundException("Ticket", request.TicketId, "TICKET_NOT_FOUND");
        await TicketAccess.EnsureCanViewAsync(db, currentUser, permissions, ticket, ct);
        if (ticket.Status is TicketStatus.Closed or TicketStatus.Rejected or TicketStatus.Cancelled or TicketStatus.Resolved)
            throw new ConflictException("TICKET_ATTACHMENT_ADD_NOT_ALLOWED", "The current ticket status does not allow adding attachments.");
        var actorId = currentUser.EmployeeId ?? throw new AppUnauthorizedException("UNAUTHENTICATED");
        var isAssignee = await TicketTeam.CanWorkAsync(db, currentUser, permissions, ticket.Id, ct);
        var isManager = await TicketAccess.IsDepartmentManagerAsync(db, currentUser, ticket, ct);
        var isActivityAttachment = request.TicketProgressEntryId.HasValue;
        if (!isActivityAttachment &&
            request.Stage is TicketAttachmentStage.Progress or TicketAttachmentStage.Resolved &&
            !isAssignee && !currentUser.HasRole(RoleType.Admin))
            throw new AppForbiddenException("TICKET_ASSIGNEE_ONLY", "Only the current assignee can add work attachments.");
        if (request.Stage == TicketAttachmentStage.Created)
            throw new BadRequestException("TICKET_ATTACHMENT_STAGE_INVALID", "Attachments for the created stage cannot be added from here.");
        if (request.Visibility == TicketAttachmentVisibility.Internal)
        {
            if (!isManager || actorId == ticket.RequesterEmployeeId)
                throw new AppForbiddenException("TICKET_INTERNAL_ATTACHMENT_FORBIDDEN", "Only a supervisor or admin on the receiving side can add internal files.");
        }

        if (isActivityAttachment)
        {
            if (request.Stage != TicketAttachmentStage.Progress)
                throw new BadRequestException("TICKET_PROGRESS_PHOTO_STAGE_INVALID", "Activity photos must use the Progress stage.");
            var entry = await db.TicketProgressEntries.FirstOrDefaultAsync(progress =>
                progress.Id == request.TicketProgressEntryId && progress.TicketId == ticket.Id, ct)
                ?? throw new NotFoundException("TicketProgressEntry", request.TicketProgressEntryId!.Value, "TICKET_PROGRESS_ENTRY_NOT_FOUND");
            if (!isAssignee && !isManager && !currentUser.HasRole(RoleType.Admin))
                throw new AppForbiddenException("TICKET_PROGRESS_PHOTO_FORBIDDEN", "You are not allowed to attach photos to this activity.");
        }

        var uploadId = ParseUploadId(request.Url);
        var pending = await db.TicketPendingUploads.FirstOrDefaultAsync(upload =>
            upload.Id == uploadId &&
            upload.UploadedByEmployeeId == actorId &&
            upload.LinkedAt == null, ct)
            ?? throw new BadRequestException("UPLOAD_TOKEN_INVALID", "The uploaded file is invalid, already used, or belongs to another user.");
        var stageCount = await db.TicketAttachments.CountAsync(a =>
            a.TicketId == ticket.Id && a.Stage == request.Stage, ct);
        var totalCount = await db.TicketAttachments.CountAsync(a => a.TicketId == ticket.Id, ct);
        if (stageCount >= 10 || totalCount >= 30)
            throw new BadRequestException("TICKET_ATTACHMENT_LIMIT_EXCEEDED", "Attachment limit reached (10 per stage, 30 per ticket).");

        var attachment = new TicketAttachment
        {
            TicketId = ticket.Id,
            TicketProgressEntryId = request.TicketProgressEntryId,
            UploadedByEmployeeId = actorId,
            FileName = pending.FileName,
            ContentType = pending.ContentType,
            SizeBytes = pending.SizeBytes,
            StorageKey = pending.StorageKey,
            Stage = request.Stage,
            Visibility = request.Visibility,
            CreatedBy = actorId,
            UpdatedBy = actorId
        };
        attachment.Url = ContentUrl(ticket.Id, attachment.Id);
        pending.LinkedAt = DateTime.UtcNow.AddHours(7);
        pending.TicketAttachmentId = attachment.Id;
        db.TicketAttachments.Add(attachment);
        await db.SaveChangesAsync(ct);
        await auditLog.LogAsync("ticket", "Ticket", ticket.Id.ToString(), "add-attachment",
            $"เพิ่มหลักฐาน {request.Stage} ใน {ticket.TicketNo}", null,
            new { AttachmentId = attachment.Id, attachment.Stage, attachment.FileName }, ct);
        return ToDto(attachment);
    }

    private static Guid ParseUploadId(string value)
    {
        const string prefix = "ticket-upload:";
        var token = value.Trim();
        if (!token.StartsWith(prefix, StringComparison.OrdinalIgnoreCase) ||
            !Guid.TryParse(token[prefix.Length..], out var uploadId))
            throw new BadRequestException("TICKET_ATTACHMENT_SOURCE_INVALID", "Attachments must be uploaded through the ticket upload endpoint.");
        return uploadId;
    }

    private static TicketAttachmentDto ToDto(TicketAttachment a)
        => new(a.Id, a.TicketProgressEntryId, a.Url, a.FileName, a.ContentType, a.SizeBytes, a.Stage, a.Visibility);
    private static string ContentUrl(Guid ticketId, Guid attachmentId)
        => $"/tickets/{ticketId}/attachments/{attachmentId}/content";
}

public record DeleteTicketAttachmentCommand(Guid TicketId, Guid AttachmentId) : IRequest;

public class DeleteTicketAttachmentHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissions,
    IAuditLogService auditLog,
    IFileStorageService storage,
    ILogger<DeleteTicketAttachmentHandler> logger) : IRequestHandler<DeleteTicketAttachmentCommand>
{
    public async Task Handle(DeleteTicketAttachmentCommand request, CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permissions, "ticket:add-attachment", ct);
        var ticket = await db.Tickets.FirstOrDefaultAsync(t => t.Id == request.TicketId, ct)
            ?? throw new NotFoundException("Ticket", request.TicketId, "TICKET_NOT_FOUND");
        await TicketAccess.EnsureCanViewAsync(db, currentUser, permissions, ticket, ct);
        if (ticket.Status is TicketStatus.Resolved or TicketStatus.Closed)
            throw new ConflictException("TICKET_ATTACHMENT_DELETE_NOT_ALLOWED", "Attachments cannot be deleted after the ticket has been submitted for review.");
        var attachment = await db.TicketAttachments.FirstOrDefaultAsync(a =>
            a.Id == request.AttachmentId && a.TicketId == ticket.Id, ct)
            ?? throw new NotFoundException("TicketAttachment", request.AttachmentId, "TICKET_ATTACHMENT_NOT_FOUND");
        var actorId = currentUser.EmployeeId ?? throw new AppUnauthorizedException("UNAUTHENTICATED");
        var isActiveAssignee = await TicketTeam.CanWorkAsync(db, currentUser, permissions, ticket.Id, ct);
        var isWorkEvidence = attachment.Stage is TicketAttachmentStage.Progress or TicketAttachmentStage.Resolved;
        if (attachment.UploadedByEmployeeId != actorId &&
            !(isWorkEvidence && isActiveAssignee) &&
            !currentUser.HasRole(RoleType.Admin))
            throw new AppForbiddenException("TICKET_ATTACHMENT_DELETE_FORBIDDEN", "You are not allowed to delete this attachment.");

        var pending = await db.TicketPendingUploads.FirstOrDefaultAsync(
            upload => upload.TicketAttachmentId == attachment.Id, ct);
        db.TicketAttachments.Remove(attachment);
        if (pending is not null)
        {
            pending.LinkedAt = null;
            pending.TicketAttachmentId = null;
        }
        await db.SaveChangesAsync(ct);
        var key = attachment.StorageKey ?? ExtractStorageKey(attachment.Url);
        if (key is not null)
        {
            try
            {
                await storage.DeleteTicketAsync(key, ct);
                if (pending is not null)
                {
                    db.TicketPendingUploads.Remove(pending);
                    await db.SaveChangesAsync(ct);
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex,
                    "Ticket attachment {AttachmentId} deleted from DB but storage cleanup is pending",
                    attachment.Id);
            }
        }
        await auditLog.LogAsync("ticket", "Ticket", ticket.Id.ToString(), "remove-attachment",
            $"ลบหลักฐานออกจาก {ticket.TicketNo}", new { attachment.Id, attachment.Stage, attachment.FileName }, null, ct);
    }

    private static string? ExtractStorageKey(string value)
    {
        var path = Uri.TryCreate(value, UriKind.Absolute, out var absolute) ? absolute.AbsolutePath : value;
        const string marker = "/uploads/";
        var index = path.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
        return index < 0 ? null : Uri.UnescapeDataString(path[(index + marker.Length)..]);
    }
}
