using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Leaves.Commands.RejectLeaveRequest;

public class RejectLeaveRequestHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permService,
    ILeaveNotificationService notification,
    IAuditLogService auditLog)
    : IRequestHandler<RejectLeaveRequestCommand, Unit>
{
    public async Task<Unit> Handle(RejectLeaveRequestCommand request, CancellationToken ct)
    {
        var actorId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

        var r = await db.LeaveRequests
            .Include(x => x.Employee)
            .Include(x => x.LeaveType)
            .FirstOrDefaultAsync(x => x.Id == request.LeaveRequestId, ct)
            ?? throw new KeyNotFoundException("ไม่พบคำขอลาที่ระบุ");

        var now = DateTime.UtcNow;

        switch (r.Status)
        {
            case LeaveStatus.PendingSupervisor:
                await currentUser.ThrowIfNoPermissionAsync(permService, "leave:approve-supervisor", ct);

                r.SupervisorId = actorId;
                r.SupervisorComment = request.Comment;
                break;

            case LeaveStatus.PendingHr:
                await currentUser.ThrowIfNoPermissionAsync(permService, "leave:approve-hr", ct);

                r.HrId = actorId;
                r.HrComment = request.Comment;
                break;

            default:
                throw new ConflictException("INVALID_STATUS", "คำขอนี้ไม่อยู่ในสถานะรออนุมัติ");
        }

        r.Status = LeaveStatus.Rejected;
        r.UpdatedAt = now;

        var balance = await db.LeaveBalances
            .FirstOrDefaultAsync(b =>
                b.EmployeeId == r.EmployeeId &&
                b.LeaveTypeId == r.LeaveTypeId &&
                b.Year == r.DateFrom.Year, ct);

        if (balance is not null)
            balance.PendingDays -= r.TotalDays;

        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module:      "leave",
            entityType:  "LeaveRequest",
            entityId:    r.Id.ToString(),
            action:      "reject",
            description: $"ปฏิเสธคำขอลาของ {r.Employee.FirstName} {r.Employee.LastName} ({r.LeaveType.NameTh} {r.DateFrom:yyyy-MM-dd} ถึง {r.DateTo:yyyy-MM-dd})",
            oldValues:   null,
            newValues:   new { status = LeaveStatus.Rejected.ToString(), comment = request.Comment },
            ct:          ct);

        await notification.EnqueueResultAsync(r.Id);

        return Unit.Value;
    }
}
