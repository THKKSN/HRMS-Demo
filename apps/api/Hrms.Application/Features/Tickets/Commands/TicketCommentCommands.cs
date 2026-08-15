using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Tickets.Dtos;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Tickets.Commands;

public record AddTicketCommentCommand(
    Guid TicketId, string Message, TicketCommentType CommentType, bool IsInternal)
    : IRequest<TicketCommentDto>;

public class AddTicketCommentValidator : AbstractValidator<AddTicketCommentCommand>
{
    public AddTicketCommentValidator() => RuleFor(x => x.Message).NotEmpty().MaximumLength(2000);
}

public class AddTicketCommentHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissions,
    IAuditLogService auditLog)
    : IRequestHandler<AddTicketCommentCommand, TicketCommentDto>
{
    public async Task<TicketCommentDto> Handle(AddTicketCommentCommand request, CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permissions, "ticket:comment", ct);
        var ticket = await db.Tickets
            .Include(t => t.RequesterEmployee)
            .Include(t => t.ExternalReporter)
            .Include(t => t.Assignments.Where(a => a.IsActive && a.IsPrimary)).ThenInclude(a => a.AssignedToEmployee)
            .FirstOrDefaultAsync(t => t.Id == request.TicketId, ct)
            ?? throw new KeyNotFoundException("ไม่พบใบแจ้งเรื่อง");
        await TicketAccess.EnsureCanViewAsync(db, currentUser, permissions, ticket, ct);
        if (ticket.Status is TicketStatus.Closed or TicketStatus.Rejected or TicketStatus.Cancelled)
            throw new ConflictException("INVALID_TICKET_STATUS", "Ticket นี้ไม่รับความคิดเห็นเพิ่มเติมแล้ว");

        var actorId = currentUser.EmployeeId ?? throw new AppUnauthorizedException("UNAUTHENTICATED");
        var isManager = await TicketAccess.IsDepartmentManagerAsync(db, currentUser, ticket, ct);
        if (request.IsInternal)
        {
            await currentUser.ThrowIfNoPermissionAsync(permissions, "ticket:add-internal-note", ct);
            if (!isManager || actorId == ticket.RequesterEmployeeId)
                throw new AppForbiddenException("เฉพาะ Supervisor หรือ Admin ฝั่งผู้รับที่เพิ่มบันทึกภายในได้");
        }
        if (!request.IsInternal && request.CommentType == TicketCommentType.RequestInfo)
            throw new FluentValidation.ValidationException("กรุณาใช้คำสั่งขอข้อมูลเพิ่ม");
        var actor = await db.Employees.FirstAsync(e => e.Id == actorId, ct);
        var type = actorId == ticket.RequesterEmployeeId ? TicketCommentType.Response : request.CommentType;
        var comment = new TicketComment
        {
            TicketId = ticket.Id,
            EmployeeId = actorId,
            CommentType = type,
            Message = request.Message.Trim(),
            IsInternal = request.IsInternal,
            CreatedBy = actorId,
            UpdatedBy = actorId
        };
        db.TicketComments.Add(comment);
        var actorName = TicketCommandSupport.FullName(actor);
        if (!comment.IsInternal)
        {
            var message = $"มีข้อความใหม่ใน {ticket.TicketNo}\nจาก: {actorName}\n{comment.Message}";
            if (actorId == ticket.RequesterEmployeeId)
            {
                var target = ticket.Assignments.FirstOrDefault()?.AssignedToEmployee;
                TicketCommandSupport.QueueNotification(
                    db, "TicketCommented", comment.Id, target?.Id, target?.LineUserId,
                    message, ticket);
            }
            else
            {
                TicketCommandSupport.QueueNotification(
                    db, "TicketCommented", comment.Id, TicketCommandSupport.Requester(ticket),
                    message, ticket);
            }
        }
        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync("ticket", "Ticket", ticket.Id.ToString(), "add-comment",
            $"{actorName} เพิ่มความคิดเห็นใน {ticket.TicketNo}", null,
            new { comment.CommentType, comment.IsInternal }, ct);
        return new TicketCommentDto(comment.Id, ticket.Id, actorId, actorName,
            comment.CommentType, comment.Message, comment.IsInternal, comment.CreatedAt);
    }
}

public record RequestTicketInfoCommand(Guid TicketId, string Message, DateTime? ExpectedUpdatedAt)
    : IRequest<TicketActionResultDto>;

public class RequestTicketInfoValidator : AbstractValidator<RequestTicketInfoCommand>
{
    public RequestTicketInfoValidator() => RuleFor(x => x.Message).NotEmpty().MaximumLength(2000);
}

public class RequestTicketInfoHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissions,
    IAuditLogService auditLog)
    : IRequestHandler<RequestTicketInfoCommand, TicketActionResultDto>
{
    public async Task<TicketActionResultDto> Handle(RequestTicketInfoCommand request, CancellationToken ct)
    {
        var ticket = await db.Tickets.Include(t => t.RequesterEmployee)
            .Include(t => t.ExternalReporter)
            .FirstOrDefaultAsync(t => t.Id == request.TicketId, ct)
            ?? throw new KeyNotFoundException("ไม่พบใบแจ้งเรื่อง");
        await TicketAccess.EnsureWorkerOrManagerAsync(db, currentUser, permissions, "ticket:update-status", ticket, ct);
        if (ticket.Status != TicketStatus.InProgress)
            throw new ConflictException("INVALID_TICKET_STATUS", "ขอข้อมูลเพิ่มได้เฉพาะงานที่กำลังดำเนินการ");
        TicketCommandSupport.EnsureExpectedVersion(ticket, request.ExpectedUpdatedAt);

        var actorId = currentUser.EmployeeId ?? throw new AppUnauthorizedException("UNAUTHENTICATED");
        var actor = await db.Employees.FirstAsync(e => e.Id == actorId, ct);
        var now = DateTime.UtcNow.AddHours(7);
        ticket.Status = TicketStatus.WaitingInfo;
        ticket.WaitingInfoByEmployeeId = actorId;
        ticket.WaitingInfoAt = now;
        TicketCommandSupport.SetWorkflowBoardState(
            ticket,
            "in_progress",
            workState: "รอข้อมูลเพิ่มเติม",
            blockerReason: "รอข้อมูลเพิ่มเติม",
            nextAction: "ติดตามผู้แจ้งเรื่อง");
        TicketCommandSupport.AddProgressEntry(
            db,
            ticket,
            actorId,
            "in_progress",
            workState: "รอข้อมูลเพิ่มเติม",
            blockerReason: "รอข้อมูลเพิ่มเติม",
            nextAction: "ติดตามผู้แจ้งเรื่อง",
            note: request.Message,
            ownerEmployeeId: actorId);
        ticket.UpdatedBy = actorId;
        TicketStatusTransition.Record(
            db, ticket, TicketStatus.InProgress, TicketStatus.WaitingInfo, actorId, now, request.Message);
        var comment = new TicketComment
        {
            TicketId = ticket.Id, EmployeeId = actorId, CommentType = TicketCommentType.RequestInfo,
            Message = request.Message.Trim(), CreatedBy = actorId, UpdatedBy = actorId
        };
        db.TicketComments.Add(comment);
        TicketCommandSupport.QueueNotification(
            db, "TicketWaitingInfo", comment.Id, TicketCommandSupport.Requester(ticket),
            $"ทีมขอข้อมูลเพิ่มสำหรับ {ticket.TicketNo}\n{request.Message.Trim()}", ticket);
        await db.SaveChangesAsync(ct);

        var actorName = TicketCommandSupport.FullName(actor);
        await auditLog.LogAsync("ticket", "Ticket", ticket.Id.ToString(), "request-info",
            $"{actorName} ขอข้อมูลเพิ่มจากผู้แจ้ง {ticket.TicketNo}",
            new { Status = TicketStatus.InProgress }, new { ticket.Status, ticket.WaitingInfoAt }, ct);
        return new TicketActionResultDto(ticket.Id, ticket.Status, ticket.UpdatedAt);
    }
}

public record ResumeTicketWorkCommand(Guid TicketId, DateTime? ExpectedUpdatedAt) : IRequest<TicketActionResultDto>;

public class ResumeTicketWorkHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissions,
    IAuditLogService auditLog)
    : IRequestHandler<ResumeTicketWorkCommand, TicketActionResultDto>
{
    public async Task<TicketActionResultDto> Handle(ResumeTicketWorkCommand request, CancellationToken ct)
    {
        var ticket = await db.Tickets.Include(t => t.RequesterEmployee)
            .Include(t => t.ExternalReporter)
            .FirstOrDefaultAsync(t => t.Id == request.TicketId, ct)
            ?? throw new KeyNotFoundException("ไม่พบใบแจ้งเรื่อง");
        await TicketAccess.EnsureActiveAssigneeAsync(db, currentUser, permissions, "ticket:update-status", ticket, ct);
        if (ticket.Status == TicketStatus.InProgress)
            return new TicketActionResultDto(ticket.Id, ticket.Status, ticket.UpdatedAt);
        if (ticket.Status != TicketStatus.WaitingInfo)
            throw new ConflictException("INVALID_TICKET_STATUS", "ดำเนินการต่อได้เฉพาะ Ticket ที่รอข้อมูล");
        TicketCommandSupport.EnsureExpectedVersion(ticket, request.ExpectedUpdatedAt);

        var actorId = currentUser.EmployeeId ?? throw new AppUnauthorizedException("UNAUTHENTICATED");
        var actor = await db.Employees.FirstAsync(e => e.Id == actorId, ct);
        var now = DateTime.UtcNow.AddHours(7);
        ticket.Status = TicketStatus.InProgress;
        TicketCommandSupport.SetWorkflowBoardState(ticket, "in_progress", workState: "ดำเนินการต่อ");
        TicketCommandSupport.AddProgressEntry(
            db,
            ticket,
            actorId,
            "in_progress",
            workState: "ดำเนินการต่อ",
            note: "WorkResumed",
            ownerEmployeeId: actorId);
        ticket.UpdatedBy = actorId;
        TicketStatusTransition.Record(
            db, ticket, TicketStatus.WaitingInfo, TicketStatus.InProgress, actorId, now, "WorkResumed");
        TicketCommandSupport.QueueNotification(
            db, "TicketStarted", Guid.NewGuid(), TicketCommandSupport.Requester(ticket),
            $"ทีมกลับมาดำเนินการ {ticket.TicketNo} แล้ว", ticket);
        await db.SaveChangesAsync(ct);
        var actorName = TicketCommandSupport.FullName(actor);
        await auditLog.LogAsync("ticket", "Ticket", ticket.Id.ToString(), "resume-work",
            $"{actorName} กลับมาดำเนินการ {ticket.TicketNo}",
            new { Status = TicketStatus.WaitingInfo }, new { ticket.Status }, ct);
        return new TicketActionResultDto(ticket.Id, ticket.Status, ticket.UpdatedAt);
    }
}
