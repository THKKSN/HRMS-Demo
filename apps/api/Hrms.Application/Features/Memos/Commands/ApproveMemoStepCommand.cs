using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Memos.Dtos;
using Hrms.Application.Features.Memos.Services;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Memos.Commands;

// อนุมัติขั้น Approval กลางทาง (เช่น Executive บริษัทปลายทาง) แล้วเลื่อนไปขั้นถัดไป
public record ApproveMemoStepCommand(Guid MemoId, Guid StepInstanceId, string? Comment)
    : IRequest<MemoStepInstanceDto>;

public class ApproveMemoStepValidator : AbstractValidator<ApproveMemoStepCommand>
{
    public ApproveMemoStepValidator()
    {
        RuleFor(x => x.MemoId).NotEmpty();
        RuleFor(x => x.StepInstanceId).NotEmpty();
        RuleFor(x => x.Comment).MaximumLength(1000);
    }
}

public class ApproveMemoStepHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IMemoStepAuthorizer stepAuthorizer,
    IAuditLogService auditLog)
    : IRequestHandler<ApproveMemoStepCommand, MemoStepInstanceDto>
{
    public async Task<MemoStepInstanceDto> Handle(ApproveMemoStepCommand request, CancellationToken ct)
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
            throw new AppForbiddenException("MEMO_STEP_APPROVE_FORBIDDEN", "You are not the approver assigned to this step.");

        step.Status = MemoStepStatus.Done;
        step.ActedAt = DateTime.UtcNow.AddHours(7);
        step.ActedByEmployeeId = employeeId;
        step.ActionNote = string.IsNullOrWhiteSpace(request.Comment) ? null : request.Comment.Trim();

        await MemoStepFlow.AdvanceAsync(db, stepAuthorizer, memo, step, ct);
        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module:      "memo",
            entityType:  "Memo",
            entityId:    memo.Id.ToString(),
            action:      "step-approve",
            description: $"อนุมัติขั้นตอนที่ {step.SortOrder} '{step.Label}'",
            oldValues:   new { StepId = step.Id, Status = MemoStepStatus.Current },
            newValues:   new { StepId = step.Id, Status = step.Status, Comment = step.ActionNote },
            ct:          ct);

        var actor = await db.Employees.AsNoTracking().FirstOrDefaultAsync(x => x.Id == employeeId, ct);
        return MemoStepGuards.ToDto(step, actor);
    }
}
