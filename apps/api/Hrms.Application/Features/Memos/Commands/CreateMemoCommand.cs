using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Memos.Dtos;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace Hrms.Application.Features.Memos.Commands;

public record CreateMemoCommand(Guid MemoTypeId, Guid MemoCategoryId, Guid MemoSubCategoryId, string Detail)
    : IRequest<MemoDto>;

public class CreateMemoValidator : AbstractValidator<CreateMemoCommand>
{
    public CreateMemoValidator()
    {
        RuleFor(x => x.MemoTypeId).NotEmpty();
        RuleFor(x => x.MemoCategoryId).NotEmpty();
        RuleFor(x => x.MemoSubCategoryId).NotEmpty();
        RuleFor(x => x.Detail).NotEmpty().MaximumLength(4000);
    }
}

public class CreateMemoHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permService,
    IAuditLogService auditLog,
    IMemoNumberGenerator memoNumberGenerator)
    : IRequestHandler<CreateMemoCommand, MemoDto>
{
    public async Task<MemoDto> Handle(CreateMemoCommand request, CancellationToken ct)
    {
        if (currentUser.EmployeeId is not { } requesterId)
            throw new AppUnauthorizedException("ไม่พบตัวตนผู้ขอ");

        await currentUser.ThrowIfNoPermissionAsync(permService, "memo:create", ct);

        var requester = await db.Employees
            .Include(x => x.Company)
            .Include(x => x.Department)
            .FirstOrDefaultAsync(x => x.Id == requesterId, ct)
            ?? throw new KeyNotFoundException("ไม่พบข้อมูลผู้ขอ");

        if (requester.DepartmentId is not { } departmentId)
            throw new ConflictException("REQUESTER_NO_DEPARTMENT", "ผู้ขอยังไม่ได้ผูกแผนก ไม่สามารถส่งเรื่องได้");

        var memoType = await db.MemoTypes.FirstOrDefaultAsync(x => x.Id == request.MemoTypeId, ct)
            ?? throw new KeyNotFoundException("ไม่พบประเภทเรื่อง");
        if (!memoType.IsActive)
            throw new ConflictException("MEMO_TYPE_INACTIVE", "ประเภทเรื่องนี้ถูกปิดใช้งานแล้ว");

        var category = await db.MemoCategories.FirstOrDefaultAsync(x => x.Id == request.MemoCategoryId, ct)
            ?? throw new KeyNotFoundException("ไม่พบหมวดหมู่");
        if (category.MemoTypeId != request.MemoTypeId)
            throw new ConflictException("CATEGORY_TYPE_MISMATCH", "หมวดหมู่นี้ไม่ได้อยู่ในประเภทเรื่องที่เลือก");
        if (!category.IsActive)
            throw new ConflictException("MEMO_CATEGORY_INACTIVE", "หมวดหมู่นี้ถูกปิดใช้งานแล้ว");

        var subCategory = await db.MemoSubCategories.FirstOrDefaultAsync(x => x.Id == request.MemoSubCategoryId, ct)
            ?? throw new KeyNotFoundException("ไม่พบหัวข้อย่อย");
        if (subCategory.MemoCategoryId != request.MemoCategoryId)
            throw new ConflictException("SUB_CATEGORY_MISMATCH", "หัวข้อย่อยนี้ไม่ได้อยู่ในหมวดหมู่ที่เลือก");
        if (!subCategory.IsActive)
            throw new ConflictException("MEMO_SUB_CATEGORY_INACTIVE", "หัวข้อย่อยนี้ถูกปิดใช้งานแล้ว");

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
            Status = MemoStatus.Pending,
        };

        db.Memos.Add(memo);

        // Approver คือ role Executive แบบ pool ทั้งระบบ ไม่ resolve ล่วงหน้า — broadcast แจ้งเตือน
        // Executive ทุกคนที่มี LineUserId ว่ามีเรื่องรออนุมัติ ใครกด approve ก่อนคือคนนั้น
        var executiveLineUserIds = await db.EmployeeRoles.AsNoTracking()
            .Where(er => er.Role.Code == RoleType.Executive && er.IsActive && er.Employee.IsActive)
            .Select(er => new { er.EmployeeId, er.Employee.LineUserId })
            .Where(x => x.LineUserId != null && x.LineUserId != "")
            .Distinct()
            .ToListAsync(ct);

        var message = $"มีเรื่องรออนุมัติ: {memoType.Name} - {category.Name} - {subCategory.Name}";
        foreach (var executive in executiveLineUserIds)
        {
            db.NotificationOutboxes.Add(new NotificationOutbox
            {
                Channel = NotificationChannel.Line,
                RecipientEmployeeId = executive.EmployeeId,
                LineUserId = executive.LineUserId!,
                EventType = "MemoSubmitted",
                EntityType = "Memo",
                EntityId = memo.Id,
                PayloadJson = JsonSerializer.Serialize(new MemoNotificationPayload(message)),
                DeduplicationKey = $"MemoSubmitted:{memo.Id:N}:{executive.EmployeeId:N}",
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
            memo.Status, null, null, null, null, null, null, null, null, null, null, memo.CreatedAt);
    }

    private static string FullName(Employee employee)
        => $"{employee.FirstName} {employee.LastName}".Trim();

    private sealed record MemoNotificationPayload(string Message);
}
