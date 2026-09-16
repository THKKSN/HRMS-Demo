using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Memos.Dtos;
using Hrms.Application.Features.Memos.Services;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Memos.Commands;

// ไม่อนุมัติที่ขั้น Approval กลางทาง — จบเรื่องเป็น Rejected (terminal) ผู้ขอต้องยื่นเรื่องใหม่
public record RejectMemoStepCommand(Guid MemoId, Guid StepInstanceId, string Reason)
    : IRequest<MemoStepInstanceDto>;

public class RejectMemoStepValidator : AbstractValidator<RejectMemoStepCommand>
{
    public RejectMemoStepValidator()
    {
        RuleFor(x => x.MemoId).NotEmpty();
        RuleFor(x => x.StepInstanceId).NotEmpty();
        RuleFor(x => x.Reason).NotEmpty().MaximumLength(1000);
    }
}

public class RejectMemoStepHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IMemoStepAuthorizer stepAuthorizer,
    IAuditLogService auditLog)
    : IRequestHandler<RejectMemoStepCommand, MemoStepInstanceDto>
{
    public async Task<MemoStepInstanceDto> Handle(RejectMemoStepCommand request, CancellationToken ct)
    {
        if (currentUser.EmployeeId is not { } employeeId)
            throw new AppUnauthorizedException("EMPLOYEE_NOT_FOUND", "Approver has no employee record.");

        var (memo, step) = await MemoStepGuards.LoadCurrentStepAsync(db, request.MemoId, request.StepInstanceId, ct);

        if (step.StepKind != MemoStepKind.Approval)
            throw new ConflictException("MEMO_STEP_IS_ACTION", "This is an action step. Use the complete-step action instead.");

        var canAct = await stepAuthorizer.CanActAsync(
            employeeId, step.AssigneeRoleCode, step.AssigneeEmployeeId,
            memo.MemoType.CompanyId, memo.MemoType.DepartmentId, MemoApproverScope.TargetOrg, ct);
        if (!canAct)
            throw new AppForbiddenException("MEMO_STEP_REJECT_FORBIDDEN", "You are not the approver assigned to this step.");

        var now = DateTime.UtcNow.AddHours(7);
        var reason = request.Reason.Trim();

        step.Status = MemoStepStatus.Rejected;
        step.ActedAt = now;
        step.ActedByEmployeeId = employeeId;
        step.ActionNote = reason;

        // จบทั้งเรื่องเป็น Rejected — สอดคล้องกับ reject ด่านแรก
        memo.Status = MemoStatus.Rejected;
        memo.RejectedAt = now;
        memo.RejectReason = reason;
        memo.CurrentStepInstanceId = null;

        var memoTitle = $"{memo.MemoType.Name} - {memo.MemoCategoryNameSnapshot} - {memo.MemoSubCategoryNameSnapshot}";
        if (!string.IsNullOrWhiteSpace(memo.Requester.LineUserId))
        {
            MemoStepFlow.AddNotifications(db, memo,
                [new MemoNotifyRecipient(memo.RequesterId, memo.Requester.LineUserId)],
                "MemoStepRejected",
                "memo.stepRejected.toRequester",
                new { memoTitle, step = step.Label, reason },
                dedupSuffix: step.Id);
        }

        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module:      "memo",
            entityType:  "Memo",
            entityId:    memo.Id.ToString(),
            action:      "step-reject",
            description: $"ไม่อนุมัติที่ขั้นตอนที่ {step.SortOrder} '{step.Label}' — เรื่องจบเป็น Rejected",
            oldValues:   new { Status = MemoStatus.Approved, StepId = step.Id },
            newValues:   new { Status = MemoStatus.Rejected, Reason = reason },
            ct:          ct);

        var actor = await db.Employees.AsNoTracking().FirstOrDefaultAsync(x => x.Id == employeeId, ct);
        return MemoStepGuards.ToDto(step, actor);
    }
}
