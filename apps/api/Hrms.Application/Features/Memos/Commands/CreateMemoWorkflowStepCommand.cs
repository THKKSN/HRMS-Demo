using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Memos.Dtos;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Memos.Commands;

// AssigneeEmployeeId = null คือ "ทุกคนใน role" (scope บริษัท/แผนกปลายทางของ MemoType ตอน resolve)
public record CreateMemoWorkflowStepCommand(
    Guid MemoTypeId, string Label, MemoStepKind StepKind,
    RoleType AssigneeRoleCode, Guid? AssigneeEmployeeId, int SortOrder)
    : IRequest<MemoWorkflowStepDto>;

public class CreateMemoWorkflowStepValidator : AbstractValidator<CreateMemoWorkflowStepCommand>
{
    public CreateMemoWorkflowStepValidator()
    {
        RuleFor(x => x.MemoTypeId).NotEmpty();
        RuleFor(x => x.Label).NotEmpty().MaximumLength(200);
        RuleFor(x => x.StepKind).IsInEnum();
        RuleFor(x => x.AssigneeRoleCode).IsInEnum();
        RuleFor(x => x.SortOrder).GreaterThan(0);
    }
}

public class CreateMemoWorkflowStepHandler(IApplicationDbContext db, IAuditLogService auditLog)
    : IRequestHandler<CreateMemoWorkflowStepCommand, MemoWorkflowStepDto>
{
    public async Task<MemoWorkflowStepDto> Handle(CreateMemoWorkflowStepCommand request, CancellationToken ct)
    {
        var memoType = await db.MemoTypes.FirstOrDefaultAsync(x => x.Id == request.MemoTypeId, ct)
            ?? throw new NotFoundException("MemoType", request.MemoTypeId, "MEMO_TYPE_NOT_FOUND");

        var assigneeName = await ValidateAssigneeAsync(db, request.AssigneeEmployeeId, request.AssigneeRoleCode, ct);

        // กัน SortOrder ชนกันใน type เดียวกัน (เฉพาะ step ที่ active)
        if (await db.MemoWorkflowSteps.AnyAsync(
                x => x.MemoTypeId == request.MemoTypeId && x.IsActive && x.SortOrder == request.SortOrder, ct))
            throw new ConflictException("DUPLICATE_SORT_ORDER", $"Step order {request.SortOrder} already exists in this memo type.");

        var step = new MemoWorkflowStep
        {
            MemoTypeId = request.MemoTypeId,
            Label = request.Label.Trim(),
            StepKind = request.StepKind,
            AssigneeRoleCode = request.AssigneeRoleCode,
            AssigneeEmployeeId = request.AssigneeEmployeeId,
            SortOrder = request.SortOrder,
            IsActive = true,
        };

        db.MemoWorkflowSteps.Add(step);
        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module:      "memo",
            entityType:  "MemoWorkflowStep",
            entityId:    step.Id.ToString(),
            action:      "workflow-step-create",
            description: $"เพิ่มขั้นตอนที่ {step.SortOrder} '{step.Label}' ในประเภทเรื่อง '{memoType.Name}'",
            oldValues:   null,
            newValues:   new { step.MemoTypeId, step.SortOrder, step.Label, step.StepKind, step.AssigneeRoleCode, step.AssigneeEmployeeId },
            ct:          ct);

        return new MemoWorkflowStepDto(
            step.Id, step.MemoTypeId, step.SortOrder, step.Label, step.StepKind,
            step.AssigneeRoleCode, step.AssigneeEmployeeId, assigneeName, step.IsActive);
    }

    // ระบุคน → ต้องมีตัวตน active และถือ role ที่เลือกอยู่จริง — คืนชื่อไว้ใช้ใน DTO
    internal static async Task<string?> ValidateAssigneeAsync(
        IApplicationDbContext db, Guid? assigneeEmployeeId, RoleType roleCode, CancellationToken ct)
    {
        if (assigneeEmployeeId is not { } employeeId)
            return null;

        var employee = await db.Employees.AsNoTracking().FirstOrDefaultAsync(x => x.Id == employeeId, ct)
            ?? throw new NotFoundException("Employee", employeeId, "ASSIGNEE_NOT_FOUND");
        if (!employee.IsActive)
            throw new ConflictException("ASSIGNEE_INACTIVE", "The selected employee is inactive.");

        var hasRole = await db.EmployeeRoles.AsNoTracking()
            .AnyAsync(er => er.EmployeeId == employeeId && er.IsActive && er.Role.Code == roleCode, ct);
        if (!hasRole)
            throw new ConflictException("ASSIGNEE_ROLE_MISMATCH", "The selected employee does not have the role required by this step.");

        return $"{employee.FirstName} {employee.LastName}".Trim();
    }
}
