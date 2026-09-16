using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Memos.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Memos.Commands;

// แก้ definition ไม่กระทบเรื่องที่วิ่งอยู่ — ทุกเรื่อง snapshot เป็น MemoStepInstance ตอนสร้างแล้ว
public record UpdateMemoWorkflowStepCommand(
    Guid Id, string Label, MemoStepKind StepKind,
    RoleType AssigneeRoleCode, Guid? AssigneeEmployeeId, int SortOrder)
    : IRequest<MemoWorkflowStepDto>;

public class UpdateMemoWorkflowStepValidator : AbstractValidator<UpdateMemoWorkflowStepCommand>
{
    public UpdateMemoWorkflowStepValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Label).NotEmpty().MaximumLength(200);
        RuleFor(x => x.StepKind).IsInEnum();
        RuleFor(x => x.AssigneeRoleCode).IsInEnum();
        RuleFor(x => x.SortOrder).GreaterThan(0);
    }
}

public class UpdateMemoWorkflowStepHandler(IApplicationDbContext db, IAuditLogService auditLog)
    : IRequestHandler<UpdateMemoWorkflowStepCommand, MemoWorkflowStepDto>
{
    public async Task<MemoWorkflowStepDto> Handle(UpdateMemoWorkflowStepCommand request, CancellationToken ct)
    {
        var step = await db.MemoWorkflowSteps
            .Include(x => x.MemoType)
            .FirstOrDefaultAsync(x => x.Id == request.Id, ct)
            ?? throw new NotFoundException("MemoWorkflowStep", request.Id, "MEMO_WORKFLOW_STEP_NOT_FOUND");

        var assigneeName = await CreateMemoWorkflowStepHandler.ValidateAssigneeAsync(
            db, request.AssigneeEmployeeId, request.AssigneeRoleCode, ct);

        if (await db.MemoWorkflowSteps.AnyAsync(
                x => x.Id != request.Id && x.MemoTypeId == step.MemoTypeId && x.IsActive && x.SortOrder == request.SortOrder, ct))
            throw new ConflictException("DUPLICATE_SORT_ORDER", $"Step order {request.SortOrder} already exists in this memo type.");

        var oldValues = new { step.SortOrder, step.Label, step.StepKind, step.AssigneeRoleCode, step.AssigneeEmployeeId };

        step.Label = request.Label.Trim();
        step.StepKind = request.StepKind;
        step.AssigneeRoleCode = request.AssigneeRoleCode;
        step.AssigneeEmployeeId = request.AssigneeEmployeeId;
        step.SortOrder = request.SortOrder;

        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module:      "memo",
            entityType:  "MemoWorkflowStep",
            entityId:    step.Id.ToString(),
            action:      "workflow-step-update",
            description: $"แก้ไขขั้นตอนที่ {step.SortOrder} '{step.Label}' ในประเภทเรื่อง '{step.MemoType.Name}'",
            oldValues:   oldValues,
            newValues:   new { step.SortOrder, step.Label, step.StepKind, step.AssigneeRoleCode, step.AssigneeEmployeeId },
            ct:          ct);

        return new MemoWorkflowStepDto(
            step.Id, step.MemoTypeId, step.SortOrder, step.Label, step.StepKind,
            step.AssigneeRoleCode, step.AssigneeEmployeeId, assigneeName, step.IsActive);
    }
}
