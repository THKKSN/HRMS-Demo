using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Memos.Dtos;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Memos.Commands;

// แก้ข้อความบันทึกความคืบหน้าที่เขียนไว้แล้ว — ไม่แตะไฟล์แนบและไม่เปลี่ยนสถานะเรื่อง
public record UpdateMemoActivityCommand(Guid MemoId, Guid ActivityId, string Message)
    : IRequest<MemoActivityDto>;

public class UpdateMemoActivityValidator : AbstractValidator<UpdateMemoActivityCommand>
{
    public UpdateMemoActivityValidator()
    {
        RuleFor(x => x.MemoId).NotEmpty();
        RuleFor(x => x.ActivityId).NotEmpty();
        RuleFor(x => x.Message).NotEmpty().MaximumLength(4000);
    }
}

public class UpdateMemoActivityHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IAuditLogService auditLog)
    : IRequestHandler<UpdateMemoActivityCommand, MemoActivityDto>
{
    public async Task<MemoActivityDto> Handle(UpdateMemoActivityCommand request, CancellationToken ct)
    {
        if (currentUser.EmployeeId is not { } employeeId)
            throw new AppUnauthorizedException("EMPLOYEE_NOT_FOUND", "Current user has no employee record.");

        var memo = await db.Memos
            .Include(x => x.MemoType)
            .FirstOrDefaultAsync(x => x.Id == request.MemoId, ct)
            ?? throw new NotFoundException("Memo", request.MemoId, "MEMO_NOT_FOUND");

        if (memo.Status == MemoStatus.Rejected)
            throw new ConflictException("MEMO_REJECTED", "This memo was not approved, so notes cannot be edited.");

        var activity = await db.MemoActivities
            .FirstOrDefaultAsync(x => x.Id == request.ActivityId && x.MemoId == memo.Id, ct)
            ?? throw new NotFoundException("MemoActivity", request.ActivityId, "MEMO_ACTIVITY_NOT_FOUND");

        if (!CanEdit(activity, employeeId, currentUser))
            throw new AppForbiddenException("MEMO_ACTIVITY_OWN_ONLY", "You can edit only the notes you wrote.");

        var before = activity.Message;
        activity.Message = request.Message.Trim();
        activity.UpdatedAt = DateTime.UtcNow.AddHours(7);
        activity.UpdatedBy = employeeId;
        await db.SaveChangesAsync(ct);

        // เก็บข้อความก่อน/หลังไว้ใน audit log — บันทึกที่คนอื่นอ่านไปแล้วถูกแก้ต้องตามรอยได้
        await auditLog.LogAsync(
            module:      "memo",
            entityType:  "Memo",
            entityId:    memo.Id.ToString(),
            action:      "activity-update",
            description: $"แก้ไขบันทึกความคืบหน้าในเรื่อง '{memo.MemoType.Name} - {memo.MemoCategoryNameSnapshot}'",
            oldValues:   new { ActivityId = activity.Id, Message = before },
            newValues:   new { ActivityId = activity.Id, activity.Message },
            ct:          ct);

        var attachments = await db.MemoAttachments.AsNoTracking()
            .Where(x => x.MemoActivityId == activity.Id)
            .OrderBy(x => x.CreatedAt)
            .Select(x => new MemoAttachmentDto(
                x.Id, x.Url, x.FileName, x.ContentType, x.SizeBytes,
                x.MemoStepInstanceId, x.MemoActivityId, null, x.CreatedAt))
            .ToListAsync(ct);

        var author = await db.Employees.AsNoTracking().FirstOrDefaultAsync(x => x.Id == employeeId, ct);
        return new MemoActivityDto(
            activity.Id, activity.Message, activity.IsSystem,
            activity.MemoStepInstanceId, null,
            author is null ? null : $"{author.FirstName} {author.LastName}".Trim(),
            activity.CreatedAt, attachments, CanEdit: true);
    }

    /// <summary>
    /// เจ้าของบันทึกแก้ของตัวเองได้ · Admin แก้ได้ทุกใบ (ดูแลระบบทั้งระบบ)
    /// บันทึกที่ระบบเขียนเอง (เช่น การตีกลับ) ห้ามแก้ เพราะเป็นร่องรอยของ flow ไม่ใช่ข้อความของคน
    /// ใช้ role ตรงๆ ไม่สร้าง permission code ใหม่ เพื่อไม่ต้อง seed permission เพิ่มบน production
    /// </summary>
    internal static bool CanEdit(MemoActivity activity, Guid employeeId, ICurrentUser user)
        => !activity.IsSystem
        && (activity.AuthorEmployeeId == employeeId || user.HasRole(RoleType.Admin));
}
