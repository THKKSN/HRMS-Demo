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

// ปิดขั้น "ดำเนินการ" (Work) พร้อมบันทึกโน้ต/ไฟล์แนบ แล้วเลื่อนไปขั้นถัดไป
public record CompleteMemoStepCommand(
    Guid MemoId, Guid StepInstanceId, string? Note,
    IReadOnlyList<MemoAttachmentInput>? Attachments = null)
    : IRequest<MemoStepInstanceDto>;

public class CompleteMemoStepValidator : AbstractValidator<CompleteMemoStepCommand>
{
    public CompleteMemoStepValidator()
    {
        RuleFor(x => x.MemoId).NotEmpty();
        RuleFor(x => x.StepInstanceId).NotEmpty();
        RuleFor(x => x.Note).MaximumLength(1000);
        RuleFor(x => x.Attachments!.Count).LessThanOrEqualTo(10).When(x => x.Attachments is not null);
    }
}

public class CompleteMemoStepHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IMemoStepAuthorizer stepAuthorizer,
    IAuditLogService auditLog)
    : IRequestHandler<CompleteMemoStepCommand, MemoStepInstanceDto>
{
    public async Task<MemoStepInstanceDto> Handle(CompleteMemoStepCommand request, CancellationToken ct)
    {
        if (currentUser.EmployeeId is not { } employeeId)
            throw new AppUnauthorizedException("EMPLOYEE_NOT_FOUND", "Current user has no employee record.");

        var (memo, step) = await MemoStepGuards.LoadCurrentStepAsync(db, request.MemoId, request.StepInstanceId, ct);

        if (step.StepKind != MemoStepKind.Work)
            throw new ConflictException("MEMO_STEP_IS_APPROVAL", "This is an approval step. Use approve, reject, or return instead.");

        var canAct = await stepAuthorizer.CanActAsync(
            employeeId, step.AssigneeRoleCode, step.AssigneeEmployeeId,
            memo.MemoType.CompanyId, memo.MemoType.DepartmentId, MemoApproverScope.TargetOrg, ct);
        if (!canAct)
            throw new AppForbiddenException("MEMO_STEP_COMPLETE_FORBIDDEN", "You are not the assignee for this step.");

        step.Status = MemoStepStatus.Done;
        step.ActedAt = DateTime.UtcNow.AddHours(7);
        step.ActedByEmployeeId = employeeId;
        step.ActionNote = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim();

        foreach (var file in request.Attachments ?? [])
        {
            db.MemoAttachments.Add(new MemoAttachment
            {
                MemoId = memo.Id,
                MemoStepInstanceId = step.Id,
                UploadedByEmployeeId = employeeId,
                Url = file.Url,
                FileName = file.FileName,
                ContentType = file.ContentType,
                SizeBytes = file.SizeBytes,
                StorageKey = file.StorageKey,
            });
        }

        await MemoStepFlow.AdvanceAsync(db, stepAuthorizer, memo, step, ct);
        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module:      "memo",
            entityType:  "Memo",
            entityId:    memo.Id.ToString(),
            action:      "step-complete",
            description: $"ดำเนินการขั้นตอนที่ {step.SortOrder} '{step.Label}' เสร็จ",
            oldValues:   new { StepId = step.Id, Status = MemoStepStatus.Current },
            newValues:   new { StepId = step.Id, Status = step.Status, step.ActionNote },
            ct:          ct);

        var actor = await db.Employees.AsNoTracking().FirstOrDefaultAsync(x => x.Id == employeeId, ct);
        return MemoStepGuards.ToDto(step, actor);
    }
}

// guard + mapping ที่ใช้ร่วมกันในกลุ่มคำสั่งจัดการ step
internal static class MemoStepGuards
{
    // โหลด memo + step และตรวจ invariant: เรื่อง Approved/รับทราบแล้ว/ยังไม่ส่งมอบ และ step เป็นคิวปัจจุบัน
    public static async Task<(Memo Memo, MemoStepInstance Step)> LoadCurrentStepAsync(
        IApplicationDbContext db, Guid memoId, Guid stepInstanceId, CancellationToken ct)
    {
        var memo = await db.Memos
            .Include(x => x.MemoType)
            .Include(x => x.Requester)
            .FirstOrDefaultAsync(x => x.Id == memoId, ct)
            ?? throw new NotFoundException("Memo", memoId, "MEMO_NOT_FOUND");

        if (memo.Status != MemoStatus.Approved)
            throw new ConflictException("MEMO_STEP_NOT_APPROVED", "Steps can be worked on only after the memo is approved.");
        if (memo.AcknowledgedAt is null)
            throw new ConflictException("MEMO_NOT_ACKNOWLEDGED", "The memo must be acknowledged before this action.");
        if (memo.DeliveredAt is not null)
            throw new ConflictException("MEMO_ALREADY_DELIVERED", "This memo has already been delivered.");

        var step = await db.MemoStepInstances
            .FirstOrDefaultAsync(x => x.Id == stepInstanceId && x.MemoId == memoId, ct)
            ?? throw new NotFoundException("MemoStepInstance", stepInstanceId, "MEMO_STEP_NOT_FOUND");

        if (step.Status != MemoStepStatus.Current)
            throw new ConflictException("MEMO_STEP_NOT_CURRENT", "This step is not the current one in the queue.");

        return (memo, step);
    }

    public static MemoStepInstanceDto ToDto(MemoStepInstance step, Employee? actedBy) => new(
        step.Id, step.SortOrder, step.Label, step.StepKind, step.Status,
        step.AssigneeRoleCode, step.AssigneeEmployeeId, null,
        step.ActedAt, actedBy is null ? null : $"{actedBy.FirstName} {actedBy.LastName}".Trim(),
        step.ActionNote, CanAct: false, CanReturn: false);
}
