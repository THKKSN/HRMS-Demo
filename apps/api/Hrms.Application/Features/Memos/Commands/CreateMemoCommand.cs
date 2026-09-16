using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Notifications;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Memos.Dtos;
using Hrms.Application.Features.Memos.Services;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Memos.Commands;

// Attachments = metadata ของไฟล์ที่ upload ผ่าน /v1/uploads (module=memos) มาก่อนแล้ว
public record CreateMemoCommand(
    Guid MemoTypeId, Guid MemoCategoryId, Guid MemoSubCategoryId, string Detail,
    IReadOnlyList<MemoAttachmentInput>? Attachments = null)
    : IRequest<MemoDto>;

public class CreateMemoValidator : AbstractValidator<CreateMemoCommand>
{
    public CreateMemoValidator()
    {
        RuleFor(x => x.MemoTypeId).NotEmpty();
        RuleFor(x => x.MemoCategoryId).NotEmpty();
        RuleFor(x => x.MemoSubCategoryId).NotEmpty();
        RuleFor(x => x.Detail).NotEmpty().MaximumLength(4000);
        RuleFor(x => x.Attachments!.Count).LessThanOrEqualTo(10).When(x => x.Attachments is not null);
    }
}

public class CreateMemoHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permService,
    IAuditLogService auditLog,
    IMemoNumberGenerator memoNumberGenerator,
    IMemoStepAuthorizer stepAuthorizer)
    : IRequestHandler<CreateMemoCommand, MemoDto>
{
    public async Task<MemoDto> Handle(CreateMemoCommand request, CancellationToken ct)
    {
        if (currentUser.EmployeeId is not { } requesterId)
            throw new AppUnauthorizedException("EMPLOYEE_NOT_FOUND", "Requester has no employee record.");

        await currentUser.ThrowIfNoPermissionAsync(permService, "memo:create", ct);

        var requester = await db.Employees
            .Include(x => x.Company)
            .Include(x => x.Department)
            .FirstOrDefaultAsync(x => x.Id == requesterId, ct)
            ?? throw new NotFoundException("Employee", requesterId, "EMPLOYEE_NOT_FOUND");

        if (requester.DepartmentId is not { } departmentId)
            throw new ConflictException("REQUESTER_NO_DEPARTMENT", "The requester has no department and cannot submit a memo.");

        var memoType = await db.MemoTypes.FirstOrDefaultAsync(x => x.Id == request.MemoTypeId, ct)
            ?? throw new NotFoundException("MemoType", request.MemoTypeId, "MEMO_TYPE_NOT_FOUND");
        if (!memoType.IsActive)
            throw new ConflictException("MEMO_TYPE_INACTIVE", "This memo type is inactive.");

        var category = await db.MemoCategories.FirstOrDefaultAsync(x => x.Id == request.MemoCategoryId, ct)
            ?? throw new NotFoundException("MemoCategory", request.MemoCategoryId, "MEMO_CATEGORY_NOT_FOUND");
        if (category.MemoTypeId != request.MemoTypeId)
            throw new ConflictException("CATEGORY_TYPE_MISMATCH", "This category does not belong to the selected memo type.");
        if (!category.IsActive)
            throw new ConflictException("MEMO_CATEGORY_INACTIVE", "This category is inactive.");

        var subCategory = await db.MemoSubCategories.FirstOrDefaultAsync(x => x.Id == request.MemoSubCategoryId, ct)
            ?? throw new NotFoundException("MemoSubCategory", request.MemoSubCategoryId, "MEMO_SUB_CATEGORY_NOT_FOUND");
        if (subCategory.MemoCategoryId != request.MemoCategoryId)
            throw new ConflictException("SUB_CATEGORY_MISMATCH", "This sub-category does not belong to the selected category.");
        if (!subCategory.IsActive)
            throw new ConflictException("MEMO_SUB_CATEGORY_INACTIVE", "This sub-category is inactive.");

        var now = DateTime.UtcNow.AddHours(7);
        var memoNo = await memoNumberGenerator.NextAsync(DateOnly.FromDateTime(now), ct);

        var memo = new Memo
        {
            MemoNo = memoNo,
            MemoTypeId = request.MemoTypeId,
            MemoCategoryId = request.MemoCategoryId,
            MemoSubCategoryId = request.MemoSubCategoryId,
            Detail = request.Detail.Trim(),
            RequesterId = requesterId,
            CompanyId = requester.CompanyId,
            DepartmentId = departmentId,
            MemoCategoryNameSnapshot = category.Name,
            MemoSubCategoryNameSnapshot = subCategory.Name,
            // snapshot ผู้อนุมัติด่านแรก — แก้ config ภายหลังไม่กระทบเรื่องนี้
            FirstApproverRoleCodeSnapshot = memoType.FirstApproverRoleCode,
            FirstApproverEmployeeIdSnapshot = memoType.FirstApproverEmployeeId,
            Status = MemoStatus.Pending,
        };

        db.Memos.Add(memo);

        // snapshot ขั้นตอนทำงานของ MemoType (เฉพาะ active) เป็น instance ต่อเรื่อง — เริ่มวิ่งหลังแผนกรับทราบ
        var workflowSteps = await db.MemoWorkflowSteps.AsNoTracking()
            .Where(x => x.MemoTypeId == request.MemoTypeId && x.IsActive)
            .OrderBy(x => x.SortOrder)
            .ToListAsync(ct);
        foreach (var step in workflowSteps)
        {
            db.MemoStepInstances.Add(new MemoStepInstance
            {
                MemoId = memo.Id,
                SourceStepId = step.Id,
                SortOrder = step.SortOrder,
                Label = step.Label,
                StepKind = step.StepKind,
                AssigneeRoleCode = step.AssigneeRoleCode,
                AssigneeEmployeeId = step.AssigneeEmployeeId,
                Status = MemoStepStatus.Waiting,
            });
        }

        // ไฟล์แนบจากผู้ขอตอนสร้างเรื่อง (StepInstance/Activity = null)
        foreach (var file in request.Attachments ?? [])
        {
            db.MemoAttachments.Add(new MemoAttachment
            {
                MemoId = memo.Id,
                UploadedByEmployeeId = requesterId,
                Url = file.Url,
                FileName = file.FileName,
                ContentType = file.ContentType,
                SizeBytes = file.SizeBytes,
                StorageKey = file.StorageKey,
            });
        }

        // แจ้งเตือนผู้อนุมัติด่านแรกตาม snapshot — ระบุคนก็แจ้งคนนั้น, All ก็ broadcast pool ของ role
        var approverRecipients = await stepAuthorizer.ResolveRecipientsAsync(
            memo.FirstApproverRoleCodeSnapshot, memo.FirstApproverEmployeeIdSnapshot,
            memoType.CompanyId, memoType.DepartmentId, MemoApproverScope.SystemPool, ct);

        var payloadJson = NotificationPayload.FromTemplate(
            "memo.submitted.toApprover",
            new { memoTitle = $"{memoType.Name} - {category.Name} - {subCategory.Name}" }).ToJson();
        foreach (var approver in approverRecipients)
        {
            db.NotificationOutboxes.Add(new NotificationOutbox
            {
                Channel = NotificationChannel.Line,
                RecipientEmployeeId = approver.EmployeeId,
                LineUserId = approver.LineUserId,
                EventType = "MemoSubmitted",
                EntityType = "Memo",
                EntityId = memo.Id,
                PayloadJson = payloadJson,
                DeduplicationKey = $"MemoSubmitted:{memo.Id:N}:{approver.EmployeeId:N}",
                Status = NotificationDeliveryStatus.Pending,
            });
        }

        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module:      "memo",
            entityType:  "Memo",
            entityId:    memo.Id.ToString(),
            action:      "create",
            description: $"สร้างเรื่อง '{memoType.Name} - {category.Name} - {subCategory.Name}'",
            oldValues:   null,
            newValues:   new { memo.MemoTypeId, memo.MemoCategoryId, memo.MemoSubCategoryId, memo.Detail },
            ct:          ct);

        return new MemoDto(
            memo.Id, memo.MemoNo, memo.MemoTypeId, memoType.Name,
            memo.MemoCategoryId, memo.MemoCategoryNameSnapshot,
            memo.MemoSubCategoryId, memo.MemoSubCategoryNameSnapshot,
            memo.Detail, memo.RequesterId, FullName(requester),
            memo.CompanyId, requester.Company.Name, memo.DepartmentId, requester.Department?.Name ?? "",
            memo.Status, null, null, null, null, null, null, null, null, null, null, null, memo.CreatedAt);
    }

    private static string FullName(Employee employee)
        => $"{employee.FirstName} {employee.LastName}".Trim();
}
