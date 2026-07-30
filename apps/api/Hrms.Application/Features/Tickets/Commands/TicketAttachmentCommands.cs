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
    TicketAttachmentVisibility Visibility) : IRequest<TicketAttachmentDto>;

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
            ?? throw new KeyNotFoundException("ไม่พบใบแจ้งเรื่อง");
        await TicketAccess.EnsureCanViewAsync(db, currentUser, permissions, ticket, ct);
        if (ticket.Status is TicketStatus.Closed or TicketStatus.Rejected or TicketStatus.Cancelled or TicketStatus.Resolved)
            throw new ConflictException("INVALID_TICKET_STATUS", "สถานะปัจจุบันไม่อนุญาตให้เพิ่มหลักฐาน");
        var actorId = currentUser.EmployeeId ?? throw new AppUnauthorizedException("UNAUTHENTICATED");
        var isAssignee = await TicketAccess.IsActiveAssigneeAsync(db, actorId, ticket.Id, ct);
        if (request.Stage is TicketAttachmentStage.Progress or TicketAttachmentStage.Resolved &&
            !isAssignee && !currentUser.HasRole(RoleType.Admin))
            throw new AppForbiddenException("เฉพาะผู้รับผิดชอบปัจจุบันที่เพิ่มหลักฐานการทำงานได้");
        if (request.Stage == TicketAttachmentStage.Created)
            throw new ValidationException("ไม่สามารถเพิ่มหลักฐานขั้นเปิดเรื่องจากหน้านี้ได้");
        if (request.Visibility == TicketAttachmentVisibility.Internal)
        {
            var isManager = await TicketAccess.IsDepartmentManagerAsync(db, currentUser, ticket, ct);
            if (!isManager || actorId == ticket.RequesterEmployeeId)
                throw new AppForbiddenException("เฉพาะ Supervisor/Admin ฝั่งผู้รับที่เพิ่มไฟล์ภายในได้");
        }

        var uploadId = ParseUploadId(request.Url);
        var pending = await db.TicketPendingUploads.FirstOrDefaultAsync(upload =>
            upload.Id == uploadId &&
            upload.UploadedByEmployeeId == actorId &&
            upload.LinkedAt == null, ct)
            ?? throw new ValidationException("ไฟล์อัปโหลดไม่ถูกต้อง ถูกใช้งานแล้ว หรือไม่ใช่ของผู้ใช้");
        var stageCount = await db.TicketAttachments.CountAsync(a =>
            a.TicketId == ticket.Id && a.Stage == request.Stage, ct);
        var totalCount = await db.TicketAttachments.CountAsync(a => a.TicketId == ticket.Id, ct);
        if (stageCount >= 10 || totalCount >= 30)
            throw new ValidationException("หลักฐานเกินจำนวนที่กำหนด (ไม่เกิน 10 ไฟล์ต่อขั้น และ 30 ไฟล์ต่อ Ticket)");

        var attachment = new TicketAttachment
        {
            TicketId = ticket.Id,
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
            throw new ValidationException("ไฟล์แนบต้องอัปโหลดผ่านระบบ Ticket");
        return uploadId;
    }

    private static TicketAttachmentDto ToDto(TicketAttachment a)
        => new(a.Id, a.Url, a.FileName, a.ContentType, a.SizeBytes, a.Stage, a.Visibility);
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
            ?? throw new KeyNotFoundException("ไม่พบใบแจ้งเรื่อง");
        await TicketAccess.EnsureCanViewAsync(db, currentUser, permissions, ticket, ct);
        if (ticket.Status is TicketStatus.Resolved or TicketStatus.Closed)
            throw new ConflictException("INVALID_TICKET_STATUS", "ไม่สามารถลบหลักฐานหลังส่งงานแล้ว");
        var attachment = await db.TicketAttachments.FirstOrDefaultAsync(a =>
            a.Id == request.AttachmentId && a.TicketId == ticket.Id, ct)
            ?? throw new KeyNotFoundException("ไม่พบไฟล์แนบ");
        var actorId = currentUser.EmployeeId ?? throw new AppUnauthorizedException("UNAUTHENTICATED");
        var isActiveAssignee = await TicketAccess.IsActiveAssigneeAsync(db, actorId, ticket.Id, ct);
        var isWorkEvidence = attachment.Stage is TicketAttachmentStage.Progress or TicketAttachmentStage.Resolved;
        if (attachment.UploadedByEmployeeId != actorId &&
            !(isWorkEvidence && isActiveAssignee) &&
            !currentUser.HasRole(RoleType.Admin))
            throw new AppForbiddenException("ไม่มีสิทธิ์ลบหลักฐานนี้");

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
