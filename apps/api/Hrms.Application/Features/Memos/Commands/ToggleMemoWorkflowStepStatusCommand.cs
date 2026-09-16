using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Memos.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Memos.Commands;

// soft delete ตามกติกาโปรเจกต์ — ปิดใช้งานแทนการลบ row
public record ToggleMemoWorkflowStepStatusCommand(Guid Id, bool IsActive) : IRequest<MemoWorkflowStepDto>;

public class ToggleMemoWorkflowStepStatusHandler(IApplicationDbContext db, IAuditLogService auditLog)
    : IRequestHandler<ToggleMemoWorkflowStepStatusCommand, MemoWorkflowStepDto>
{
    public async Task<MemoWorkflowStepDto> Handle(ToggleMemoWorkflowStepStatusCommand request, CancellationToken ct)
    {
        var step = await db.MemoWorkflowSteps
            .Include(x => x.MemoType)
            .Include(x => x.AssigneeEmployee)
            .FirstOrDefaultAsync(x => x.Id == request.Id, ct)
            ?? throw new NotFoundException("MemoWorkflowStep", request.Id, "MEMO_WORKFLOW_STEP_NOT_FOUND");

        // เปิดกลับมาแล้ว SortOrder ชนกับ step ที่ active อยู่ → ให้แก้ลำดับก่อน
        if (request.IsActive && !step.IsActive &&
            await db.MemoWorkflowSteps.AnyAsync(
                x => x.Id != step.Id && x.MemoTypeId == step.MemoTypeId && x.IsActive && x.SortOrder == step.SortOrder, ct))
            throw new ConflictException("DUPLICATE_SORT_ORDER_ON_ACTIVATE", $"Step order {step.SortOrder} is already taken. Change the order before activating.");

        var oldValue = step.IsActive;
        step.IsActive = request.IsActive;

        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module:      "memo",
            entityType:  "MemoWorkflowStep",
            entityId:    step.Id.ToString(),
            action:      "workflow-step-toggle",
            description: $"{(request.IsActive ? "เปิด" : "ปิด")}ใช้งานขั้นตอน '{step.Label}' ในประเภทเรื่อง '{step.MemoType.Name}'",
            oldValues:   new { IsActive = oldValue },
            newValues:   new { step.IsActive },
            ct:          ct);

        return new MemoWorkflowStepDto(
            step.Id, step.MemoTypeId, step.SortOrder, step.Label, step.StepKind,
            step.AssigneeRoleCode, step.AssigneeEmployeeId,
            step.AssigneeEmployee is null ? null : $"{step.AssigneeEmployee.FirstName} {step.AssigneeEmployee.LastName}".Trim(),
            step.IsActive);
    }
}
