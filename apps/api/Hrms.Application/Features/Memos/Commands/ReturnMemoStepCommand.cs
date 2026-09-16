using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Memos.Dtos;
using Hrms.Application.Features.Memos.Services;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Memos.Commands;

// ย้อนเรื่องกลับไปแก้ไข — กติกาต่างกันตามชนิดของขั้นที่กด:
//   Approval (ผู้ตัดสิน)   → เลือกปลายทางได้ทุกขั้นก่อนหน้า หรือย้อนถึงผู้ขอ
//   Work (ผู้ทำงาน)        → ส่งคืนได้เฉพาะขั้นก่อนหน้าติดกัน ไม่มีสิทธิ์ย้อนถึงผู้ขอหรือปิดเรื่อง
// ขั้นที่เสร็จไปแล้วระหว่างทางถูกล้างให้เดินซ้ำทั้งสาย (ดู MemoStepFlow.ReturnToStepAsync)
public record ReturnMemoStepCommand(
    Guid MemoId, Guid StepInstanceId, string Reason,
    Guid? TargetStepInstanceId = null, bool ToRequester = false)
    : IRequest<MemoStepInstanceDto>;

public class ReturnMemoStepValidator : AbstractValidator<ReturnMemoStepCommand>
{
    public ReturnMemoStepValidator()
    {
        RuleFor(x => x.MemoId).NotEmpty();
        RuleFor(x => x.StepInstanceId).NotEmpty();
        RuleFor(x => x.Reason).NotEmpty().MaximumLength(1000);
        RuleFor(x => x.TargetStepInstanceId)
            .Empty().When(x => x.ToRequester)
            .WithErrorCode("MEMO_STEP_RETURN_TARGET_CONFLICT").WithMessage("A target step cannot be given when returning to the requester.");
    }
}

public class ReturnMemoStepHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IMemoStepAuthorizer stepAuthorizer,
    IAuditLogService auditLog)
    : IRequestHandler<ReturnMemoStepCommand, MemoStepInstanceDto>
{
    public async Task<MemoStepInstanceDto> Handle(ReturnMemoStepCommand request, CancellationToken ct)
    {
        if (currentUser.EmployeeId is not { } employeeId)
            throw new AppUnauthorizedException("EMPLOYEE_NOT_FOUND", "Actor has no employee record.");

        var (memo, step) = await MemoStepGuards.LoadCurrentStepAsync(db, request.MemoId, request.StepInstanceId, ct);
        var target = await ResolveTargetAsync(request, memo, step, ct);

        var canAct = await stepAuthorizer.CanActAsync(
            employeeId, step.AssigneeRoleCode, step.AssigneeEmployeeId,
            memo.MemoType.CompanyId, memo.MemoType.DepartmentId, MemoApproverScope.TargetOrg, ct);
        if (!canAct)
            throw new AppForbiddenException("MEMO_STEP_RETURN_FORBIDDEN", "You are not the assignee for this step.");

        var reason = request.Reason.Trim();

        if (target is null)
        {
            await MemoStepFlow.ReturnToRequesterAsync(
                db, memo, step, reason, employeeId, DateTime.UtcNow.AddHours(7), ct);
        }
        else
        {
            await MemoStepFlow.ReturnToStepAsync(
                db, stepAuthorizer, memo, step, target, reason, employeeId, ct);
        }

        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module:      "memo",
            entityType:  "Memo",
            entityId:    memo.Id.ToString(),
            action:      "step-return",
            description: target is null
                ? $"ตีกลับจากขั้นตอนที่ {step.SortOrder} '{step.Label}' ไปให้ผู้ขอแก้ไข"
                : $"ตีกลับจากขั้นตอนที่ {step.SortOrder} '{step.Label}' ไปขั้นตอนที่ {target.SortOrder} '{target.Label}'",
            oldValues:   new { CurrentStepId = step.Id },
            newValues:   new { CurrentStepId = target?.Id, ToRequester = target is null, Reason = reason },
            ct:          ct);

        var actor = await db.Employees.AsNoTracking().FirstOrDefaultAsync(x => x.Id == employeeId, ct);
        // ย้อนถึงผู้ขอไม่มีขั้นปลายทาง — คืนขั้นที่กดแทนให้ client รู้ว่าขั้นนั้นถอยเป็น Waiting แล้ว
        return MemoStepGuards.ToDto(target ?? step, actor);
    }

    // คืน null = ปลายทางคือผู้ขอ (ไม่ใช่ขั้นตอนใด)
    private async Task<MemoStepInstance?> ResolveTargetAsync(
        ReturnMemoStepCommand request, Memo memo, MemoStepInstance step, CancellationToken ct)
    {
        var isApproval = step.StepKind == MemoStepKind.Approval;

        if (request.ToRequester)
        {
            if (!isApproval)
                throw new ConflictException("MEMO_STEP_RETURN_NOT_ALLOWED",
                    "An action step can return only to the immediately preceding step; returning to the requester is reserved for approval steps.");
            return null;
        }

        var previousStep = await db.MemoStepInstances
            .Where(x => x.MemoId == memo.Id && x.SortOrder < step.SortOrder)
            .OrderByDescending(x => x.SortOrder)
            .FirstOrDefaultAsync(ct);

        if (request.TargetStepInstanceId is not { } targetId)
            return previousStep ?? throw NoPrevious(isApproval);

        var target = await db.MemoStepInstances
            .FirstOrDefaultAsync(x => x.Id == targetId && x.MemoId == memo.Id, ct)
            ?? throw new NotFoundException("MemoStepInstance", targetId, "MEMO_STEP_TARGET_NOT_FOUND");

        if (target.SortOrder >= step.SortOrder)
            throw new ConflictException("MEMO_STEP_RETURN_TARGET_INVALID",
                "You can only return to an earlier step.");
        if (!isApproval && target.Id != previousStep?.Id)
            throw new ConflictException("MEMO_STEP_RETURN_NOT_ALLOWED",
                "An action step can return only to the immediately preceding step; choosing the target step is reserved for approval steps.");

        return target;
    }

    private static ConflictException NoPrevious(bool isApproval) => new(
        "MEMO_STEP_NO_PREVIOUS",
        isApproval
            ? "ขั้นนี้เป็นขั้นแรก ไม่มีขั้นก่อนหน้า — ใช้ตีกลับให้ผู้ขอแทน"
            : "ขั้นนี้เป็นขั้นแรก ไม่มีขั้นก่อนหน้าให้ส่งคืน");
}
