using Hrms.Application.Common.Notifications;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Memos.Dtos;
using Hrms.Application.Features.Memos.Services;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Memos.Commands;

public record AcknowledgeMemoCommand(Guid Id) : IRequest<MemoDto>;

public class AcknowledgeMemoHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permService,
    IMemoStepAuthorizer stepAuthorizer,
    IAuditLogService auditLog)
    : IRequestHandler<AcknowledgeMemoCommand, MemoDto>
{
    public async Task<MemoDto> Handle(AcknowledgeMemoCommand request, CancellationToken ct)
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
            .FirstOrDefaultAsync(x => x.Id == request.Id, ct)
            ?? throw new NotFoundException("Memo", request.Id, "MEMO_NOT_FOUND");

        if (memo.Status != MemoStatus.Approved)
            throw new ConflictException("MEMO_ACKNOWLEDGE_NOT_APPROVED", "Only approved memos can be acknowledged.");

        if (memo.AcknowledgedAt is not null)
            throw new ConflictException("MEMO_ALREADY_ACKNOWLEDGED", "This memo has already been acknowledged.");

        // เฉพาะ Supervisor ของแผนกปลายทาง — role scope ตรง หรือตัวพนักงานสังกัดแผนกปลายทางนั้นเอง
        var canAcknowledge = await db.EmployeeRoles.AsNoTracking()
            .AnyAsync(er => er.EmployeeId == employeeId && er.IsActive &&
                er.Role.Code == RoleType.Supervisor &&
                ((er.CompanyId == memo.MemoType.CompanyId && er.DepartmentId == memo.MemoType.DepartmentId) ||
                 (er.Employee.CompanyId == memo.MemoType.CompanyId && er.Employee.DepartmentId == memo.MemoType.DepartmentId)), ct);
        if (!canAcknowledge)
            throw new AppForbiddenException("MEMO_ACKNOWLEDGE_FORBIDDEN", "Only the target department manager can acknowledge this memo.");

        memo.AcknowledgedAt = DateTime.UtcNow.AddHours(7);
        memo.AcknowledgedByEmployeeId = employeeId;

        var memoTitle = $"{memo.MemoType.Name} - {memo.MemoCategoryNameSnapshot} - {memo.MemoSubCategoryNameSnapshot}";

        // ถ้าเรื่องนี้มีขั้นตอนทำงาน (snapshot ไว้ตอนสร้าง) — เริ่มขั้นแรกทันทีหลังรับทราบ
        var firstStep = await db.MemoStepInstances
            .Where(x => x.MemoId == memo.Id)
            .OrderBy(x => x.SortOrder)
            .FirstOrDefaultAsync(ct);
        if (firstStep is not null)
        {
            firstStep.Status = MemoStepStatus.Current;
            memo.CurrentStepInstanceId = firstStep.Id;

            var stepRecipients = await stepAuthorizer.ResolveRecipientsAsync(
                firstStep.AssigneeRoleCode, firstStep.AssigneeEmployeeId,
                memo.MemoType.CompanyId, memo.MemoType.DepartmentId, MemoApproverScope.TargetOrg, ct);
            foreach (var recipient in stepRecipients)
            {
                db.NotificationOutboxes.Add(new NotificationOutbox
                {
                    Channel = NotificationChannel.Line,
                    RecipientEmployeeId = recipient.EmployeeId,
                    LineUserId = recipient.LineUserId,
                    EventType = "MemoStepReady",
                    EntityType = "Memo",
                    EntityId = memo.Id,
                    PayloadJson = NotificationPayload.FromTemplate(
                        "memo.stepReady.toAssignee",
                        new { memoTitle, step = firstStep.Label }).ToJson(),
                    DeduplicationKey = $"MemoStepReady:{memo.Id:N}:{firstStep.Id:N}:{recipient.EmployeeId:N}",
                    Status = NotificationDeliveryStatus.Pending,
                });
            }
        }

        await db.SaveChangesAsync(ct);
        await auditLog.LogAsync(
            module:      "memo",
            entityType:  "Memo",
            entityId:    memo.Id.ToString(),
            action:      "acknowledge",
            description: $"รับทราบเรื่อง '{memoTitle}'",
            oldValues:   null,
            newValues:   new { memo.AcknowledgedAt, memo.AcknowledgedByEmployeeId },
            ct:          ct);

        var acknowledger = await db.Employees.AsNoTracking().FirstOrDefaultAsync(x => x.Id == employeeId, ct);

        return new MemoDto(
            memo.Id, memo.MemoNo, memo.MemoTypeId, memo.MemoType.Name,
            memo.MemoCategoryId, memo.MemoCategoryNameSnapshot,
            memo.MemoSubCategoryId, memo.MemoSubCategoryNameSnapshot,
            memo.Detail, memo.RequesterId, FullName(memo.Requester),
            memo.CompanyId, memo.Company.Name, memo.DepartmentId, memo.Department.Name, memo.Status,
            memo.ApprovedAt, memo.ApprovedByEmployee is null ? null : FullName(memo.ApprovedByEmployee),
            memo.ApproveComment,
            memo.RejectedAt, memo.RejectReason,
            memo.AcknowledgedAt, acknowledger is null ? null : FullName(acknowledger),
            null, null, null, null,
            memo.CreatedAt);
    }

    private static string FullName(Employee employee)
        => $"{employee.FirstName} {employee.LastName}".Trim();
}
