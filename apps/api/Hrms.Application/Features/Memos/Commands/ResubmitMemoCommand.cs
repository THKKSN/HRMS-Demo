using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Memos.Dtos;
using Hrms.Application.Features.Memos.Services;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Memos.Commands;

// ผู้ขอส่งเรื่องที่ถูกตีกลับมาหาตัวเองกลับเข้า workflow — เดินใหม่ตั้งแต่ขั้นแรก
// ไม่แก้ Detail ของใบเดิม (ไม่มี UpdateMemoCommand) ข้อมูลเพิ่มเติมแนบผ่านบันทึกความคืบหน้า
public record ResubmitMemoCommand(Guid MemoId, string? Note) : IRequest<MemoStepInstanceDto>;

public class ResubmitMemoValidator : AbstractValidator<ResubmitMemoCommand>
{
    public ResubmitMemoValidator()
    {
        RuleFor(x => x.MemoId).NotEmpty();
        RuleFor(x => x.Note).MaximumLength(1000);
    }
}

public class ResubmitMemoHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IMemoStepAuthorizer stepAuthorizer,
    IAuditLogService auditLog)
    : IRequestHandler<ResubmitMemoCommand, MemoStepInstanceDto>
{
    public async Task<MemoStepInstanceDto> Handle(ResubmitMemoCommand request, CancellationToken ct)
    {
        if (currentUser.EmployeeId is not { } employeeId)
            throw new AppUnauthorizedException("EMPLOYEE_NOT_FOUND", "Current user has no employee record.");

        var memo = await db.Memos
            .Include(x => x.MemoType)
            .Include(x => x.Requester)
            .FirstOrDefaultAsync(x => x.Id == request.MemoId, ct)
            ?? throw new NotFoundException("Memo", request.MemoId, "MEMO_NOT_FOUND");

        if (memo.ReturnedToRequesterAt is null)
            throw new ConflictException("MEMO_NOT_RETURNED", "This memo was not returned for revision.");
        if (memo.Status != MemoStatus.Approved)
            throw new ConflictException("MEMO_RESUBMIT_NOT_APPROVED", "Only approved memos can be sent back into the workflow.");
        if (memo.DeliveredAt is not null)
            throw new ConflictException("MEMO_ALREADY_DELIVERED", "This memo has already been delivered.");

        // เจ้าของเรื่องเท่านั้น (Admin ทำแทนได้ — escape hatch กรณีผู้ขอลาออก/ไม่อยู่)
        if (memo.RequesterId != employeeId && !currentUser.HasRole(RoleType.Admin))
            throw new AppForbiddenException("MEMO_RESUBMIT_REQUESTER_ONLY", "Only the original requester can send this memo back into the workflow.");

        var returnedFromStepId = memo.ReturnedFromStepInstanceId;
        var firstStep = await MemoStepFlow.ResumeFromRequesterAsync(
            db, stepAuthorizer, memo, request.Note, ct);

        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module:      "memo",
            entityType:  "Memo",
            entityId:    memo.Id.ToString(),
            action:      "resubmit",
            description: $"ผู้ขอส่งเรื่องกลับเข้าขั้นตอนที่ {firstStep.SortOrder} '{firstStep.Label}'",
            oldValues:   new { ReturnedFromStepId = returnedFromStepId, CurrentStepId = (Guid?)null },
            newValues:   new { CurrentStepId = firstStep.Id, Note = request.Note?.Trim() },
            ct:          ct);

        var actor = await db.Employees.AsNoTracking().FirstOrDefaultAsync(x => x.Id == employeeId, ct);
        return MemoStepGuards.ToDto(firstStep, actor);
    }
}
