using Hrms.Application.Common.Notifications;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Memos.Dtos;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Memos.Commands;

public record DeliverMemoCommand(Guid Id) : IRequest<MemoDto>;

public class DeliverMemoHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permService,
    IAuditLogService auditLog)
    : IRequestHandler<DeliverMemoCommand, MemoDto>
{
    public async Task<MemoDto> Handle(DeliverMemoCommand request, CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permService, "memo:view-inbox", ct);

        if (currentUser.EmployeeId is not { } employeeId)
            throw new AppUnauthorizedException("EMPLOYEE_NOT_FOUND", "Current user has no employee record.");

        var memo = await db.Memos
            .Include(x => x.MemoType)
            .Include(x => x.Requester)
            .Include(x => x.Company)
            .Include(x => x.Department)
            .Include(x => x.ApprovedByEmployee)
            .Include(x => x.AcknowledgedByEmployee)
            .FirstOrDefaultAsync(x => x.Id == request.Id, ct)
            ?? throw new NotFoundException("Memo", request.Id, "MEMO_NOT_FOUND");

        if (memo.Status != MemoStatus.Approved)
            throw new ConflictException("MEMO_DELIVER_NOT_APPROVED", "Only approved memos can be delivered.");

        if (memo.AcknowledgedAt is null)
            throw new ConflictException("MEMO_NOT_ACKNOWLEDGED", "The memo must be acknowledged before this action.");

        if (memo.DeliveredAt is not null)
            throw new ConflictException("MEMO_ALREADY_DELIVERED", "This memo has already been delivered.");

        // เรื่องที่มีขั้นตอนทำงาน — ต้องทำครบทุกขั้น (Done) ก่อนจึงส่งมอบได้
        // เรื่องเก่า/type ไม่มี step → ไม่มี instance → ผ่าน guard นี้เหมือนเดิม
        var hasIncompleteStep = await db.MemoStepInstances.AsNoTracking()
            .AnyAsync(x => x.MemoId == memo.Id && x.Status != MemoStepStatus.Done, ct);
        if (hasIncompleteStep)
            throw new ConflictException("MEMO_STEPS_INCOMPLETE", "Some steps are still open. All steps must be completed before delivery.");

        // เฉพาะ Supervisor ของแผนกปลายทาง — role scope ตรง หรือตัวพนักงานสังกัดแผนกปลายทางนั้นเอง
        var canDeliver = await db.EmployeeRoles.AsNoTracking()
            .AnyAsync(er => er.EmployeeId == employeeId && er.IsActive &&
                er.Role.Code == RoleType.Supervisor &&
                ((er.CompanyId == memo.MemoType.CompanyId && er.DepartmentId == memo.MemoType.DepartmentId) ||
                 (er.Employee.CompanyId == memo.MemoType.CompanyId && er.Employee.DepartmentId == memo.MemoType.DepartmentId)), ct);
        if (!canDeliver)
            throw new AppForbiddenException("MEMO_DELIVER_FORBIDDEN", "Only the target department manager can deliver this memo.");

        memo.DeliveredAt = DateTime.UtcNow.AddHours(7);
        memo.DeliveredByEmployeeId = employeeId;

        // แจ้งผู้ขอว่างานส่งมอบแล้ว รอกดยืนยันตรวจรับ — ข้ามถ้าไม่มี LineUserId
        var memoTitle = $"{memo.MemoType.Name} - {memo.MemoCategoryNameSnapshot} - {memo.MemoSubCategoryNameSnapshot}";
        if (!string.IsNullOrWhiteSpace(memo.Requester.LineUserId))
        {
            db.NotificationOutboxes.Add(new NotificationOutbox
            {
                Channel = NotificationChannel.Line,
                RecipientEmployeeId = memo.RequesterId,
                LineUserId = memo.Requester.LineUserId,
                EventType = "MemoDeliveredToRequester",
                EntityType = "Memo",
                EntityId = memo.Id,
                PayloadJson = NotificationPayload.FromTemplate(
                    "memo.deliveredToRequester.toRequester", new { memoTitle }).ToJson(),
                DeduplicationKey = $"MemoDeliveredToRequester:{memo.Id:N}",
                Status = NotificationDeliveryStatus.Pending,
            });
        }

        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module:      "memo",
            entityType:  "Memo",
            entityId:    memo.Id.ToString(),
            action:      "deliver",
            description: $"ส่งมอบเรื่อง '{memoTitle}'",
            oldValues:   null,
            newValues:   new { memo.DeliveredAt, memo.DeliveredByEmployeeId },
            ct:          ct);

        var deliverer = await db.Employees.AsNoTracking().FirstOrDefaultAsync(x => x.Id == employeeId, ct);

        return new MemoDto(
            memo.Id, memo.MemoNo, memo.MemoTypeId, memo.MemoType.Name,
            memo.MemoCategoryId, memo.MemoCategoryNameSnapshot,
            memo.MemoSubCategoryId, memo.MemoSubCategoryNameSnapshot,
            memo.Detail, memo.RequesterId, FullName(memo.Requester),
            memo.CompanyId, memo.Company.Name, memo.DepartmentId, memo.Department.Name, memo.Status,
            memo.ApprovedAt, memo.ApprovedByEmployee is null ? null : FullName(memo.ApprovedByEmployee),
            memo.ApproveComment,
            memo.RejectedAt, memo.RejectReason,
            memo.AcknowledgedAt, memo.AcknowledgedByEmployee is null ? null : FullName(memo.AcknowledgedByEmployee),
            memo.DeliveredAt, deliverer is null ? null : FullName(deliverer),
            null, null,
            memo.CreatedAt);
    }

    private static string FullName(Domain.Entities.Employee employee)
        => $"{employee.FirstName} {employee.LastName}".Trim();
}
