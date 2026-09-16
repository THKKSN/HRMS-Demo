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

public record ApproveMemoCommand(Guid Id, string? Comment) : IRequest<MemoDto>;

public class ApproveMemoValidator : AbstractValidator<ApproveMemoCommand>
{
    public ApproveMemoValidator()
    {
        RuleFor(x => x.Comment).MaximumLength(1000);
    }
}

public class ApproveMemoHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IMemoStepAuthorizer stepAuthorizer,
    IAuditLogService auditLog)
    : IRequestHandler<ApproveMemoCommand, MemoDto>
{
    public async Task<MemoDto> Handle(ApproveMemoCommand request, CancellationToken ct)
    {
        if (currentUser.EmployeeId is not { } approverId)
            throw new AppUnauthorizedException("EMPLOYEE_NOT_FOUND", "Approver has no employee record.");

        var memo = await db.Memos
            .Include(x => x.MemoType).ThenInclude(t => t.Company)
            .Include(x => x.MemoType).ThenInclude(t => t.Department)
            .Include(x => x.Requester)
            .Include(x => x.Company)
            .Include(x => x.Department)
            .FirstOrDefaultAsync(x => x.Id == request.Id, ct)
            ?? throw new NotFoundException("Memo", request.Id, "MEMO_NOT_FOUND");

        if (memo.Status != MemoStatus.Pending)
            throw new ConflictException("MEMO_NOT_PENDING", "This memo is not awaiting approval.");

        // ผู้อนุมัติด่านแรกตาม snapshot ของเรื่อง — default Executive/null = pool ทั้งระบบ (พฤติกรรมเดิม)
        // ระบุคน = คนนั้นเท่านั้น (Admin ทำแทนได้เสมอ)
        var canApprove = await stepAuthorizer.CanActAsync(
            approverId, memo.FirstApproverRoleCodeSnapshot, memo.FirstApproverEmployeeIdSnapshot,
            memo.MemoType.CompanyId, memo.MemoType.DepartmentId, MemoApproverScope.SystemPool, ct);
        if (!canApprove)
            throw new AppForbiddenException("MEMO_APPROVE_FORBIDDEN", "You are not the approver assigned to this memo.");

        memo.Status = MemoStatus.Approved;
        memo.ApprovedAt = DateTime.UtcNow.AddHours(7);
        memo.ApprovedByEmployeeId = approverId;
        memo.ApproveComment = string.IsNullOrWhiteSpace(request.Comment) ? null : request.Comment.Trim();

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
                // บรรทัดแรก = title การ์ด, บรรทัดถัดไปแสดงเป็นแถวรายละเอียด (label: value)
                // ความเห็นไม่มีค่า → บรรทัดนั้นในเทมเพลตหายไปเอง
                PayloadJson = NotificationPayload.FromTemplate(
                    "memo.approved.toRequester",
                    new { memoTitle, comment = memo.ApproveComment }).ToJson(),
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

        var deliveryPayload = NotificationPayload.FromTemplate(
            "memo.approved.toTargetSupervisor",
            new
            {
                memoTitle,
                target = $"{memo.MemoType.Company.Name} / {memo.MemoType.Department.Name}",
                comment = memo.ApproveComment,
            }).ToJson();
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
                PayloadJson = deliveryPayload,
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
            newValues:   new { status = MemoStatus.Approved, comment = memo.ApproveComment },
            ct:          ct);

        var approver = await db.Employees.AsNoTracking().FirstOrDefaultAsync(x => x.Id == approverId, ct);

        return new MemoDto(
            memo.Id, memo.MemoNo, memo.MemoTypeId, memo.MemoType.Name,
            memo.MemoCategoryId, memo.MemoCategoryNameSnapshot,
            memo.MemoSubCategoryId, memo.MemoSubCategoryNameSnapshot,
            memo.Detail, memo.RequesterId, FullName(memo.Requester),
            memo.CompanyId, memo.Company.Name, memo.DepartmentId, memo.Department.Name, memo.Status,
            memo.ApprovedAt, approver is null ? null : FullName(approver), memo.ApproveComment,
            null, null, null, null, null, null, null, null, memo.CreatedAt);
    }

    private static string FullName(Employee employee)
        => $"{employee.FirstName} {employee.LastName}".Trim();
}
