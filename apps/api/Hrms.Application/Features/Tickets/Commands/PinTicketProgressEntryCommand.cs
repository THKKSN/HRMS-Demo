using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Options;
using Hrms.Application.Features.Tickets.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Hrms.Application.Features.Tickets.Commands;

/// <summary>ปัก/เลิกปักหมุดการ์ดกิจกรรมในบอร์ด — การ์ดที่ปักไว้จะถูกเรียงขึ้นบนสุดของ activity feed</summary>
public record PinTicketProgressEntryCommand(
    Guid TicketId,
    Guid EntryId,
    bool IsPinned,
    DateTime? ExpectedUpdatedAt) : IRequest<TicketActionResultDto>;

/// <summary>
/// สิทธิ์ 2 ชั้น: permission `ticket:pin-progress-entry` (ตั้งค่าได้จาก permission matrix)
/// + ต้องเป็นผู้รับผิดชอบปัจจุบัน / หัวหน้าแผนกปลายทาง / Admin ของใบแจ้งเรื่องนี้ (กติการะบบ)
/// ปักหมุดเป็นการจัดบอร์ด ไม่ใช่แก้เนื้อหา จึงปักการ์ดใบไหนก็ได้ ไม่จำกัดเฉพาะการ์ดตัวเอง
/// เพดานจำนวนหมุดอ่านจาก appsettings `Ticket:MaxPinnedProgressEntries` (default 3)
/// </summary>
public class PinTicketProgressEntryHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissions,
    IAuditLogService auditLog,
    IOptions<TicketOptions> ticketOptions)
    : IRequestHandler<PinTicketProgressEntryCommand, TicketActionResultDto>
{
    public async Task<TicketActionResultDto> Handle(PinTicketProgressEntryCommand request, CancellationToken ct)
    {
        var ticket = await db.Tickets.FirstOrDefaultAsync(t => t.Id == request.TicketId, ct)
            ?? throw new NotFoundException("Ticket", request.TicketId, "TICKET_NOT_FOUND");
        await currentUser.ThrowIfNoPermissionAsync(permissions, TicketAccess.PinProgressEntryPermission, ct);
        await TicketAccess.EnsureWorkerOrManagerRelationAsync(db, currentUser, ticket, ct);
        if (ticket.Status is not (TicketStatus.InProgress or TicketStatus.WaitingInfo))
            throw new ConflictException("TICKET_PIN_NOT_ALLOWED", "Cards can be pinned only while the ticket is in progress or waiting for information.");
        TicketCommandSupport.EnsureExpectedVersion(ticket, request.ExpectedUpdatedAt);

        var entry = await db.TicketProgressEntries
            .FirstOrDefaultAsync(e => e.Id == request.EntryId && e.TicketId == ticket.Id, ct)
            ?? throw new NotFoundException("TicketProgressEntry", request.EntryId, "TICKET_PROGRESS_ENTRY_NOT_FOUND");

        var actorId = currentUser.EmployeeId ?? throw new AppUnauthorizedException("UNAUTHENTICATED");
        var alreadyInRequestedState = request.IsPinned == entry.PinnedAt.HasValue;
        if (alreadyInRequestedState)
            return new TicketActionResultDto(ticket.Id, ticket.Status, ticket.UpdatedAt, entry.Id);

        if (request.IsPinned)
        {
            var maxPinned = Math.Max(1, ticketOptions.Value.MaxPinnedProgressEntries);
            var pinnedCount = await db.TicketProgressEntries.CountAsync(other =>
                other.TicketId == ticket.Id && other.PinnedAt != null, ct);
            if (pinnedCount >= maxPinned)
                throw new ConflictException(
                    "PIN_LIMIT_REACHED",
                    $"At most {maxPinned} cards can be pinned per ticket. Unpin another card first.");
            entry.PinnedAt = DateTime.UtcNow.AddHours(7);
            entry.PinnedByEmployeeId = actorId;
        }
        else
        {
            entry.PinnedAt = null;
            entry.PinnedByEmployeeId = null;
        }
        entry.UpdatedBy = actorId;
        ticket.UpdatedBy = actorId;
        await db.SaveChangesAsync(ct);

        var actor = await db.Employees.FirstAsync(e => e.Id == actorId, ct);
        var actorName = TicketCommandSupport.FullName(actor);
        await auditLog.LogAsync(
            "ticket",
            "Ticket",
            ticket.Id.ToString(),
            request.IsPinned ? "pin-progress-entry" : "unpin-progress-entry",
            request.IsPinned
                ? $"{actorName} ปักหมุดการ์ดกิจกรรมใน {ticket.TicketNo}"
                : $"{actorName} เลิกปักหมุดการ์ดกิจกรรมใน {ticket.TicketNo}",
            null,
            new { entry.Id, entry.WorkState, entry.BlockerReason, entry.NextAction, entry.PinnedAt },
            ct);

        return new TicketActionResultDto(ticket.Id, ticket.Status, ticket.UpdatedAt, entry.Id);
    }
}
