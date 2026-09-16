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

// เพิ่มการ์ด activity ระหว่างดำเนินการ — ผู้ขอ, Admin, หรือผู้เกี่ยวข้องกับขั้นตอนใดๆ ของเรื่อง
public record AddMemoActivityCommand(
    Guid MemoId, string Message,
    IReadOnlyList<MemoAttachmentInput>? Attachments = null)
    : IRequest<MemoActivityDto>;

public class AddMemoActivityValidator : AbstractValidator<AddMemoActivityCommand>
{
    public AddMemoActivityValidator()
    {
        RuleFor(x => x.MemoId).NotEmpty();
        RuleFor(x => x.Message).NotEmpty().MaximumLength(4000);
        RuleFor(x => x.Attachments!.Count).LessThanOrEqualTo(10).When(x => x.Attachments is not null);
    }
}

public class AddMemoActivityHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IMemoStepAuthorizer stepAuthorizer,
    IAuditLogService auditLog)
    : IRequestHandler<AddMemoActivityCommand, MemoActivityDto>
{
    public async Task<MemoActivityDto> Handle(AddMemoActivityCommand request, CancellationToken ct)
    {
        if (currentUser.EmployeeId is not { } employeeId)
            throw new AppUnauthorizedException("EMPLOYEE_NOT_FOUND", "Current user has no employee record.");

        var memo = await db.Memos
            .Include(x => x.MemoType)
            .FirstOrDefaultAsync(x => x.Id == request.MemoId, ct)
            ?? throw new NotFoundException("Memo", request.MemoId, "MEMO_NOT_FOUND");

        if (memo.Status == MemoStatus.Rejected)
            throw new ConflictException("MEMO_REJECTED", "This memo was not approved, so activities cannot be added.");

        if (!await CanAddActivityAsync(db, stepAuthorizer, memo, employeeId, ct))
            throw new AppForbiddenException("MEMO_ACTIVITY_FORBIDDEN", "You are not allowed to add activities to this memo.");

        var activity = new MemoActivity
        {
            MemoId = memo.Id,
            MemoStepInstanceId = memo.CurrentStepInstanceId,
            AuthorEmployeeId = employeeId,
            Message = request.Message.Trim(),
            IsSystem = false,
        };
        db.MemoActivities.Add(activity);

        var attachmentDtos = new List<MemoAttachmentDto>();
        foreach (var file in request.Attachments ?? [])
        {
            var attachment = new MemoAttachment
            {
                MemoId = memo.Id,
                MemoActivityId = activity.Id,
                UploadedByEmployeeId = employeeId,
                Url = file.Url,
                FileName = file.FileName,
                ContentType = file.ContentType,
                SizeBytes = file.SizeBytes,
                StorageKey = file.StorageKey,
            };
            db.MemoAttachments.Add(attachment);
            attachmentDtos.Add(new MemoAttachmentDto(
                attachment.Id, attachment.Url, attachment.FileName, attachment.ContentType,
                attachment.SizeBytes, null, activity.Id, null, attachment.CreatedAt));
        }

        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module:      "memo",
            entityType:  "Memo",
            entityId:    memo.Id.ToString(),
            action:      "activity-add",
            description: $"เพิ่ม activity ในเรื่อง '{memo.MemoType.Name} - {memo.MemoCategoryNameSnapshot}'",
            oldValues:   null,
            newValues:   new { ActivityId = activity.Id, activity.Message },
            ct:          ct);

        var author = await db.Employees.AsNoTracking().FirstOrDefaultAsync(x => x.Id == employeeId, ct);
        return new MemoActivityDto(
            activity.Id, activity.Message, activity.IsSystem,
            activity.MemoStepInstanceId, null,
            author is null ? null : $"{author.FirstName} {author.LastName}".Trim(),
            activity.CreatedAt, attachmentDtos);
    }

    // ผู้ขอ / คนที่เคยทำ step / ผู้รับผิดชอบ step ใด step หนึ่งของเรื่อง (รวม Admin ผ่าน authorizer)
    internal static async Task<bool> CanAddActivityAsync(
        IApplicationDbContext db, IMemoStepAuthorizer stepAuthorizer, Memo memo, Guid employeeId, CancellationToken ct)
    {
        if (memo.RequesterId == employeeId)
            return true;

        var steps = await db.MemoStepInstances.AsNoTracking()
            .Where(x => x.MemoId == memo.Id)
            .Select(x => new { x.AssigneeRoleCode, x.AssigneeEmployeeId, x.ActedByEmployeeId })
            .ToListAsync(ct);

        if (steps.Any(s => s.ActedByEmployeeId == employeeId))
            return true;

        // Supervisor แผนกปลายทาง (คนกดรับทราบ/ส่งมอบ) เพิ่ม activity ได้เสมอ
        var candidates = steps
            .Select(s => (s.AssigneeRoleCode, s.AssigneeEmployeeId))
            .Append((RoleType.Supervisor, (Guid?)null))
            .Distinct();

        foreach (var (roleCode, assigneeId) in candidates)
        {
            if (await stepAuthorizer.CanActAsync(
                    employeeId, roleCode, assigneeId,
                    memo.MemoType.CompanyId, memo.MemoType.DepartmentId, MemoApproverScope.TargetOrg, ct))
                return true;
        }
        return false;
    }
}
