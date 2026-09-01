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
            throw new AppUnauthorizedException("ไม่พบตัวตนผู้ใช้");

        var memo = await db.Memos
            .Include(x => x.MemoType)
            .Include(x => x.Requester)
            .Include(x => x.Company)
            .Include(x => x.Department)
            .Include(x => x.ApprovedByEmployee)
            .Include(x => x.AcknowledgedByEmployee)
            .FirstOrDefaultAsync(x => x.Id == request.Id, ct)
            ?? throw new KeyNotFoundException("ไม่พบเรื่อง");

        if (memo.Status != MemoStatus.Approved)
            throw new ConflictException("MEMO_NOT_APPROVED", "ส่งมอบได้เฉพาะเรื่องที่อนุมัติแล้วเท่านั้น");

        if (memo.AcknowledgedAt is null)
            throw new ConflictException("MEMO_NOT_ACKNOWLEDGED", "ต้องรับทราบเรื่องนี้ก่อนจึงจะส่งมอบได้");

        if (memo.DeliveredAt is not null)
            throw new ConflictException("MEMO_ALREADY_DELIVERED", "เรื่องนี้ถูกส่งมอบไปแล้ว");

        // เฉพาะ Supervisor ของแผนกปลายทาง — role scope ตรง หรือตัวพนักงานสังกัดแผนกปลายทางนั้นเอง
        var canDeliver = await db.EmployeeRoles.AsNoTracking()
            .AnyAsync(er => er.EmployeeId == employeeId && er.IsActive &&
                er.Role.Code == RoleType.Supervisor &&
                ((er.CompanyId == memo.MemoType.CompanyId && er.DepartmentId == memo.MemoType.DepartmentId) ||
                 (er.Employee.CompanyId == memo.MemoType.CompanyId && er.Employee.DepartmentId == memo.MemoType.DepartmentId)), ct);
        if (!canDeliver)
            throw new AppForbiddenException("ไม่มีสิทธิ์ส่งมอบเรื่องนี้ — ต้องเป็นหัวหน้าแผนกปลายทางเท่านั้น");

        memo.DeliveredAt = DateTime.UtcNow.AddHours(7);
        memo.DeliveredByEmployeeId = employeeId;

        // แจ้งผู้ขอว่างานส่งมอบแล้ว รอกดยืนยันรับของ — ข้ามถ้าไม่มี LineUserId
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
                PayloadJson = System.Text.Json.JsonSerializer.Serialize(
                    new MemoNotificationPayload($"เรื่อง '{memoTitle}' ดำเนินการเสร็จแล้ว กรุณายืนยันรับของ/รับงาน")),
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
            memo.RejectedAt, memo.RejectReason,
            memo.AcknowledgedAt, memo.AcknowledgedByEmployee is null ? null : FullName(memo.AcknowledgedByEmployee),
            memo.DeliveredAt, deliverer is null ? null : FullName(deliverer),
            null, null,
            memo.CreatedAt);
    }

    private static string FullName(Domain.Entities.Employee employee)
        => $"{employee.FirstName} {employee.LastName}".Trim();

    private sealed record MemoNotificationPayload(string Message);
}
