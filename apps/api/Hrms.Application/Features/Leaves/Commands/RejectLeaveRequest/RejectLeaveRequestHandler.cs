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
    ILeaveNotificationService notification)
    : IRequestHandler<RejectLeaveRequestCommand, Unit>
{
    public async Task<Unit> Handle(RejectLeaveRequestCommand request, CancellationToken ct)
    {
        var actorId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

        var r = await db.LeaveRequests
            .FirstOrDefaultAsync(x => x.Id == request.LeaveRequestId, ct)
            ?? throw new KeyNotFoundException("ไม่พบคำขอลาที่ระบุ");

        var now = DateTime.UtcNow;

        switch (r.Status)
        {
            case LeaveStatus.PendingSupervisor:
                if (!currentUser.IsSupervisorOrAbove())
                    throw new AppForbiddenException("ต้องมีสิทธิ์ Supervisor ขึ้นไปจึงจะปฏิเสธในขั้นตอนนี้ได้");

                r.SupervisorId = actorId;
                r.SupervisorComment = request.Comment;
                break;

            case LeaveStatus.PendingHr:
                if (!currentUser.IsAdminOrHr())
                    throw new AppForbiddenException("ต้องมีสิทธิ์ HR ขึ้นไปจึงจะปฏิเสธในขั้นตอนนี้ได้");

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

        await notification.EnqueueResultAsync(r.Id);

        return Unit.Value;
    }
}
