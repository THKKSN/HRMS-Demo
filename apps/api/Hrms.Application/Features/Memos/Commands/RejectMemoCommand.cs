using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Notifications;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Memos.Dtos;
using Hrms.Application.Features.Memos.Services;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Memos.Commands;

// Reason เป็น optional — ผู้บริหารไม่ต้องกรอกก็ปฏิเสธได้ (นโยบายเดียวกับ comment ตอนอนุมัติ)
public record RejectMemoCommand(Guid Id, string? Reason) : IRequest<MemoDto>;

public class RejectMemoValidator : AbstractValidator<RejectMemoCommand>
{
    public RejectMemoValidator()
    {
        RuleFor(x => x.Reason).MaximumLength(1000);
    }
}

public class RejectMemoHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IMemoStepAuthorizer stepAuthorizer,
    IAuditLogService auditLog)
    : IRequestHandler<RejectMemoCommand, MemoDto>
{
    public async Task<MemoDto> Handle(RejectMemoCommand request, CancellationToken ct)
    {
        if (currentUser.EmployeeId is not { } approverId)
            throw new AppUnauthorizedException("EMPLOYEE_NOT_FOUND", "Approver has no employee record.");

        var memo = await db.Memos
            .Include(x => x.MemoType)
            .Include(x => x.Requester)
            .Include(x => x.Company)
            .Include(x => x.Department)
            .FirstOrDefaultAsync(x => x.Id == request.Id, ct)
            ?? throw new NotFoundException("Memo", request.Id, "MEMO_NOT_FOUND");

        if (memo.Status != MemoStatus.Pending)
            throw new ConflictException("MEMO_NOT_PENDING", "This memo is not awaiting approval.");

        // สิทธิ์เดียวกับการอนุมัติ — ตาม snapshot ผู้อนุมัติด่านแรกของเรื่อง (Admin ทำแทนได้เสมอ)
        var canReject = await stepAuthorizer.CanActAsync(
            approverId, memo.FirstApproverRoleCodeSnapshot, memo.FirstApproverEmployeeIdSnapshot,
            memo.MemoType.CompanyId, memo.MemoType.DepartmentId, MemoApproverScope.SystemPool, ct);
        if (!canReject)
            throw new AppForbiddenException("MEMO_REJECT_FORBIDDEN", "You are not the approver assigned to this memo.");

        memo.Status = MemoStatus.Rejected;
        memo.RejectedAt = DateTime.UtcNow.AddHours(7);
        memo.RejectReason = string.IsNullOrWhiteSpace(request.Reason) ? null : request.Reason.Trim();

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
                // บรรทัดแรก = title การ์ด, เหตุผลแยกเป็นแถวรายละเอียดด้านล่าง (หายไปเองถ้าไม่มีเหตุผล)
                PayloadJson = NotificationPayload.FromTemplate(
                    "memo.rejected.toRequester",
                    new
                    {
                        memoTitle = $"{memo.MemoType.Name} - {memo.MemoCategoryNameSnapshot} - {memo.MemoSubCategoryNameSnapshot}",
                        reason = memo.RejectReason,
                    }).ToJson(),
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
            null, null, null, memo.RejectedAt, memo.RejectReason, null, null, null, null, null, null, memo.CreatedAt);
    }

    private static string FullName(Employee employee)
        => $"{employee.FirstName} {employee.LastName}".Trim();
}
