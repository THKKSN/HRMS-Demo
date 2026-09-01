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

public record RejectMemoCommand(Guid Id, string Reason) : IRequest<MemoDto>;

public class RejectMemoValidator : AbstractValidator<RejectMemoCommand>
{
    public RejectMemoValidator()
    {
        RuleFor(x => x.Reason).NotEmpty().MaximumLength(1000);
    }
}

public class RejectMemoHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permService,
    IAuditLogService auditLog)
    : IRequestHandler<RejectMemoCommand, MemoDto>
{
    public async Task<MemoDto> Handle(RejectMemoCommand request, CancellationToken ct)
    {
        if (currentUser.EmployeeId is not { } approverId)
            throw new AppUnauthorizedException("ไม่พบตัวตนผู้อนุมัติ");

        // ผู้อนุมัติคือใครก็ได้ที่มี permission memo:approve (default: Executive, Admin) แบบ pool
        // ทั้งระบบ ไม่ scope ตาม company/department — permission เป็น source of truth เดียว
        await currentUser.ThrowIfNoPermissionAsync(permService, "memo:approve", ct);

        var memo = await db.Memos
            .Include(x => x.MemoType)
            .Include(x => x.Requester)
            .Include(x => x.Company)
            .Include(x => x.Department)
            .FirstOrDefaultAsync(x => x.Id == request.Id, ct)
            ?? throw new KeyNotFoundException("ไม่พบเรื่อง");

        if (memo.Status != MemoStatus.Pending)
            throw new ConflictException("MEMO_NOT_PENDING", "เรื่องนี้ไม่ได้อยู่ในสถานะรออนุมัติ");

        memo.Status = MemoStatus.Rejected;
        memo.RejectedAt = DateTime.UtcNow.AddHours(7);
        memo.RejectReason = request.Reason.Trim();

        if (!string.IsNullOrWhiteSpace(memo.Requester.LineUserId))
        {
            db.NotificationOutboxes.Add(new NotificationOutbox
            {
                Channel = NotificationChannel.Line,
                RecipientEmployeeId = memo.RequesterId,
                LineUserId = memo.Requester.LineUserId,
                EventType = "MemoRejected",
                EntityType = "Memo",
                EntityId = memo.Id,
                PayloadJson = JsonSerializer.Serialize(new MemoNotificationPayload(
                    $"เรื่อง '{memo.MemoType.Name} - {memo.MemoCategoryNameSnapshot} - {memo.MemoSubCategoryNameSnapshot}' ไม่ได้รับการอนุมัติ: {memo.RejectReason}")),
                DeduplicationKey = $"MemoRejected:{memo.Id:N}",
                Status = NotificationDeliveryStatus.Pending,
            });
        }

        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module:      "memo",
            entityType:  "Memo",
            entityId:    memo.Id.ToString(),
            action:      "reject",
            description: $"ไม่อนุมัติเรื่อง '{memo.MemoType.Name} - {memo.MemoCategoryNameSnapshot} - {memo.MemoSubCategoryNameSnapshot}'",
            oldValues:   new { status = MemoStatus.Pending },
            newValues:   new { status = MemoStatus.Rejected, reason = memo.RejectReason },
            ct:          ct);

        return new MemoDto(
            memo.Id, memo.MemoNo, memo.MemoTypeId, memo.MemoType.Name,
            memo.MemoCategoryId, memo.MemoCategoryNameSnapshot,
            memo.MemoSubCategoryId, memo.MemoSubCategoryNameSnapshot,
            memo.Detail, memo.RequesterId, FullName(memo.Requester),
            memo.CompanyId, memo.Company.Name, memo.DepartmentId, memo.Department.Name, memo.Status,
            null, null, memo.RejectedAt, memo.RejectReason, null, null, null, null, null, null, memo.CreatedAt);
    }

    private static string FullName(Employee employee)
        => $"{employee.FirstName} {employee.LastName}".Trim();

    private sealed record MemoNotificationPayload(string Message);
}
