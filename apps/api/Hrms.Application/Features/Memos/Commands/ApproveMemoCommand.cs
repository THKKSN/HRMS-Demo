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

public record ApproveMemoCommand(Guid Id, string? Comment) : IRequest<MemoDto>;

public class ApproveMemoHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permService,
    IAuditLogService auditLog)
    : IRequestHandler<ApproveMemoCommand, MemoDto>
{
    public async Task<MemoDto> Handle(ApproveMemoCommand request, CancellationToken ct)
    {
        if (currentUser.EmployeeId is not { } approverId)
            throw new AppUnauthorizedException("ไม่พบตัวตนผู้อนุมัติ");

        // ผู้อนุมัติคือใครก็ได้ที่มี permission memo:approve (default: Executive, Admin) แบบ pool
        // ทั้งระบบ ไม่ scope ตาม company/department — permission เป็น source of truth เดียว
        await currentUser.ThrowIfNoPermissionAsync(permService, "memo:approve", ct);

        var memo = await db.Memos
            .Include(x => x.MemoType).ThenInclude(t => t.Company)
            .Include(x => x.MemoType).ThenInclude(t => t.Department)
            .Include(x => x.Requester)
            .Include(x => x.Company)
            .Include(x => x.Department)
            .FirstOrDefaultAsync(x => x.Id == request.Id, ct)
            ?? throw new KeyNotFoundException("ไม่พบเรื่อง");

        if (memo.Status != MemoStatus.Pending)
            throw new ConflictException("MEMO_NOT_PENDING", "เรื่องนี้ไม่ได้อยู่ในสถานะรออนุมัติ");

        memo.Status = MemoStatus.Approved;
        memo.ApprovedAt = DateTime.UtcNow.AddHours(7);
        memo.ApprovedByEmployeeId = approverId;

        var memoTitle = $"{memo.MemoType.Name} - {memo.MemoCategoryNameSnapshot} - {memo.MemoSubCategoryNameSnapshot}";

        // แจ้งผู้ขอว่าเรื่องได้รับการอนุมัติแล้ว — ข้ามถ้าไม่มี LineUserId (ตาม pattern เดิมของ Ticket module)
        if (!string.IsNullOrWhiteSpace(memo.Requester.LineUserId))
        {
            db.NotificationOutboxes.Add(new NotificationOutbox
            {
                Channel = NotificationChannel.Line,
                RecipientEmployeeId = memo.RequesterId,
                LineUserId = memo.Requester.LineUserId,
                EventType = "MemoApproved",
                EntityType = "Memo",
                EntityId = memo.Id,
                PayloadJson = JsonSerializer.Serialize(new MemoNotificationPayload($"เรื่อง '{memoTitle}' ได้รับการอนุมัติแล้ว")),
                DeduplicationKey = $"MemoApproved:{memo.Id:N}",
                Status = NotificationDeliveryStatus.Pending,
            });
        }

        // แจ้ง Supervisor ทุกคนใน Company/Department ปลายทางที่ MemoType ผูกไว้ ว่ามีเรื่องอนุมัติแล้วส่งเข้ามา
        // match ได้ 2 ทาง: role Supervisor ที่ scope ตรงปลายทาง หรือ Supervisor ที่ตัวพนักงานสังกัดแผนกปลายทางนั้นเอง
        // (role มักถูก grant โดยไม่ scope department — ถ้าเช็คแค่ scope ตรงจะไม่แจ้งใครเลย)
        var supervisorLineUserIds = await db.EmployeeRoles.AsNoTracking()
            .Where(er =>
                er.Role.Code == RoleType.Supervisor && er.IsActive &&
                ((er.CompanyId == memo.MemoType.CompanyId && er.DepartmentId == memo.MemoType.DepartmentId) ||
                 (er.Employee.CompanyId == memo.MemoType.CompanyId && er.Employee.DepartmentId == memo.MemoType.DepartmentId)) &&
                er.Employee.IsActive)
            .Select(er => new { er.EmployeeId, er.Employee.LineUserId })
            .Where(x => x.LineUserId != null && x.LineUserId != "")
            .Distinct()
            .ToListAsync(ct);

        var deliveryMessage = $"เรื่อง '{memoTitle}' ได้รับการอนุมัติแล้ว ส่งเข้า {memo.MemoType.Company.Name} / {memo.MemoType.Department.Name}";
        foreach (var supervisor in supervisorLineUserIds)
        {
            db.NotificationOutboxes.Add(new NotificationOutbox
            {
                Channel = NotificationChannel.Line,
                RecipientEmployeeId = supervisor.EmployeeId,
                LineUserId = supervisor.LineUserId!,
                EventType = "MemoDelivered",
                EntityType = "Memo",
                EntityId = memo.Id,
                PayloadJson = JsonSerializer.Serialize(new MemoNotificationPayload(deliveryMessage)),
                DeduplicationKey = $"MemoDelivered:{memo.Id:N}:{supervisor.EmployeeId:N}",
                Status = NotificationDeliveryStatus.Pending,
            });
        }

        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module:      "memo",
            entityType:  "Memo",
            entityId:    memo.Id.ToString(),
            action:      "approve",
            description: $"อนุมัติเรื่อง '{memoTitle}'",
            oldValues:   new { status = MemoStatus.Pending },
            newValues:   new { status = MemoStatus.Approved, comment = request.Comment },
            ct:          ct);

        var approver = await db.Employees.AsNoTracking().FirstOrDefaultAsync(x => x.Id == approverId, ct);

        return new MemoDto(
            memo.Id, memo.MemoNo, memo.MemoTypeId, memo.MemoType.Name,
            memo.MemoCategoryId, memo.MemoCategoryNameSnapshot,
            memo.MemoSubCategoryId, memo.MemoSubCategoryNameSnapshot,
            memo.Detail, memo.RequesterId, FullName(memo.Requester),
            memo.CompanyId, memo.Company.Name, memo.DepartmentId, memo.Department.Name, memo.Status,
            memo.ApprovedAt, approver is null ? null : FullName(approver), null, null, null, null, null, null, null, null, memo.CreatedAt);
    }

    private static string FullName(Employee employee)
        => $"{employee.FirstName} {employee.LastName}".Trim();

    private sealed record MemoNotificationPayload(string Message);
}
