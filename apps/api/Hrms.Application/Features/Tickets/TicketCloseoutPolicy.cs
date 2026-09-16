using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Tickets;

/// <summary>
/// กติกาความครบถ้วนของข้อมูลจบงาน (รายละเอียดการแก้ไข / รูปหลักฐาน) ก่อนส่งงานให้ตรวจและก่อนปิดงาน
/// บังคับหรือไม่ขึ้นกับ flag ของ "ประเภทปัญหา/เหตุผลปิดงาน" ที่ ticket เลือก — default บังคับทั้งคู่
/// ใช้ตัวเดียวกันทั้ง Resolve และ Close เพื่อไม่ให้มีช่องข้ามกติกาทางอ้อม
/// </summary>
internal static class TicketCloseoutPolicy
{
    public static async Task EnsureReadyForReviewAsync(
        IApplicationDbContext db,
        Ticket ticket,
        bool hasResolvedEvidence,
        CancellationToken ct)
    {
        if (ticket.CloseoutReasonId is null)
            throw new BadRequestException("TICKET_CLOSEOUT_REASON_REQUIRED", "A closeout reason is required.");

        var requirement = await db.TicketCloseoutReasons
            .AsNoTracking()
            .Where(reason => reason.Id == ticket.CloseoutReasonId.Value)
            .Select(reason => new { reason.RequiresResolutionNote, reason.RequiresCompletionEvidence })
            .FirstOrDefaultAsync(ct);
        // เหตุผลหายไป (ไม่ควรเกิดเพราะ FK เป็น SetNull) → ใช้กติกาเข้มสุดไว้ก่อน
        var requiresNote = requirement?.RequiresResolutionNote ?? true;
        var requiresEvidence = requirement?.RequiresCompletionEvidence ?? true;

        if (requiresNote && string.IsNullOrWhiteSpace(ticket.ResolutionNote))
            throw new BadRequestException("TICKET_RESOLUTION_DETAIL_REQUIRED", "Resolution details are required.");
        if (requiresEvidence && !hasResolvedEvidence)
            throw new BadRequestException("TICKET_RESOLUTION_ATTACHMENT_REQUIRED", "At least one after-fix attachment is required.");
    }
}
