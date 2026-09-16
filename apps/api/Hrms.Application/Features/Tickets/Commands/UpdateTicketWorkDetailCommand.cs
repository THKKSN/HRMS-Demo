using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Tickets.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Tickets.Commands;

/// <param name="ProblemType">enum เดิม — รับไว้เพื่อ backward compatible; ถ้าส่ง CloseoutReasonId มา ค่านี้จะถูก sync จาก master แทน</param>
/// <param name="CloseoutReasonId">ประเภทปัญหา/เหตุผลปิดงานจาก master (ticket_closeout_reasons) — บังคับก่อนส่งงานให้ตรวจ</param>
public record UpdateTicketWorkDetailCommand(
    Guid TicketId,
    TicketProblemType? ProblemType,
    string? InitialInspectionNote,
    string? ResolutionNote,
    Guid? CloseoutReasonId,
    DateTime? ExpectedUpdatedAt) : IRequest<TicketActionResultDto>;

public class UpdateTicketWorkDetailValidator : AbstractValidator<UpdateTicketWorkDetailCommand>
{
    public UpdateTicketWorkDetailValidator()
    {
        RuleFor(x => x.InitialInspectionNote).MaximumLength(2000);
        RuleFor(x => x.ResolutionNote).MaximumLength(2000);
    }
}

public class UpdateTicketWorkDetailHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissions,
    IAuditLogService auditLog)
    : IRequestHandler<UpdateTicketWorkDetailCommand, TicketActionResultDto>
{
    public async Task<TicketActionResultDto> Handle(UpdateTicketWorkDetailCommand request, CancellationToken ct)
    {
        var ticket = await db.Tickets.FirstOrDefaultAsync(t => t.Id == request.TicketId, ct)
            ?? throw new NotFoundException("Ticket", request.TicketId, "TICKET_NOT_FOUND");
        await TicketTeam.EnsureCanWorkAsync(db, currentUser, permissions, "ticket:update-status", ticket.Id, ct);
        if (ticket.Status is not (TicketStatus.Assigned or TicketStatus.InProgress or TicketStatus.WaitingInfo))
            throw new ConflictException("TICKET_WORK_DETAIL_NOT_EDITABLE", "The current ticket status does not allow editing work details.");
        TicketCommandSupport.EnsureExpectedVersion(ticket, request.ExpectedUpdatedAt);

        var old = new { ticket.ProblemType, ticket.CloseoutReasonId, ticket.CloseoutReasonNameSnapshot, ticket.InitialInspectionNote, ticket.ResolutionNote };
        ticket.ProblemType = request.ProblemType;
        if (request.CloseoutReasonId.HasValue)
        {
            var reason = await ResolveCloseoutReasonAsync(ticket, request.CloseoutReasonId.Value, ct);
            ticket.CloseoutReasonId = reason.Id;
            ticket.CloseoutReasonNameSnapshot = reason.Name;
            // แถว default ที่ seed จาก enum เดิมจะ sync column problem_type ให้ด้วย เพื่อให้รายงาน/filter เดิมยังใช้ได้ช่วงเปลี่ยนผ่าน
            if (Enum.TryParse<TicketProblemType>(reason.LegacyProblemType, out var legacy))
                ticket.ProblemType = legacy;
        }
        else
        {
            ticket.CloseoutReasonId = null;
            ticket.CloseoutReasonNameSnapshot = null;
        }
        ticket.InitialInspectionNote = TrimOrNull(request.InitialInspectionNote);
        ticket.ResolutionNote = TrimOrNull(request.ResolutionNote);
        ticket.UpdatedBy = currentUser.EmployeeId;
        await db.SaveChangesAsync(ct);
        await auditLog.LogAsync("ticket", "Ticket", ticket.Id.ToString(), "update-work-detail",
            $"อัปเดตข้อมูลการดำเนินงาน {ticket.TicketNo}", old,
            new { ticket.ProblemType, ticket.CloseoutReasonId, ticket.CloseoutReasonNameSnapshot, ticket.InitialInspectionNote, ticket.ResolutionNote }, ct);
        return new TicketActionResultDto(ticket.Id, ticket.Status, ticket.UpdatedAt);
    }

    /// <summary>เหตุผลต้องอยู่บริษัทปลายทาง ยังเปิดใช้ (ยกเว้นเป็นค่าเดิมที่เลือกไว้แล้ว) ตรง scope แผนก และตรงหมวดถ้ามีการผูกหมวด</summary>
    private async Task<Domain.Entities.TicketCloseoutReason> ResolveCloseoutReasonAsync(
        Domain.Entities.Ticket ticket, Guid closeoutReasonId, CancellationToken ct)
    {
        var reason = await db.TicketCloseoutReasons
            .Include(r => r.Categories)
            .FirstOrDefaultAsync(r => r.Id == closeoutReasonId && r.CompanyId == ticket.TargetCompanyId, ct)
            ?? throw new NotFoundException("TicketCloseoutReason", closeoutReasonId, "TICKET_CLOSEOUT_REASON_NOT_FOUND");
        if (ticket.CloseoutReasonId == reason.Id) return reason;
        if (!reason.IsActive)
            throw new BadRequestException("TICKET_CLOSEOUT_REASON_INACTIVE", "This closeout reason is inactive. Pick another one.");
        if (reason.DepartmentId.HasValue && reason.DepartmentId != ticket.TargetDepartmentId)
            throw new BadRequestException("TICKET_CLOSEOUT_REASON_DEPARTMENT_MISMATCH", "This closeout reason belongs to another department than the ticket target department.");
        if (reason.Categories.Count > 0 &&
            (!ticket.CategoryId.HasValue || reason.Categories.All(link => link.CategoryId != ticket.CategoryId.Value)))
            throw new BadRequestException("TICKET_CLOSEOUT_REASON_CATEGORY_MISMATCH", "This closeout reason is not enabled for the category of this ticket.");
        return reason;
    }

    private static string? TrimOrNull(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
