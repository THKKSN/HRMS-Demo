using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Leaves.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Leaves.Commands.ApproveLeaveRequest;

public class ApproveLeaveRequestHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    ILeaveNotificationService notification)
    : IRequestHandler<ApproveLeaveRequestCommand, LeaveRequestDto>
{
    public async Task<LeaveRequestDto> Handle(ApproveLeaveRequestCommand request, CancellationToken ct)
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
                if (!currentUser.IsSupervisorOrAbove())
                    throw new AppForbiddenException("ต้องมีสิทธิ์ Supervisor ขึ้นไปจึงจะอนุมัติในขั้นตอนนี้ได้");

                r.Status = LeaveStatus.PendingHr;
                r.SupervisorId = actorId;
                r.SupervisorComment = request.Comment;
                r.SupervisorApprovedAt = now;
                break;

            case LeaveStatus.PendingHr:
                if (!currentUser.IsAdminOrHr())
                    throw new AppForbiddenException("ต้องมีสิทธิ์ HR ขึ้นไปจึงจะอนุมัติในขั้นตอนนี้ได้");

                r.Status = LeaveStatus.Approved;
                r.HrId = actorId;
                r.HrComment = request.Comment;
                r.HrApprovedAt = now;

                var balance = await db.LeaveBalances
                    .FirstOrDefaultAsync(b =>
                        b.EmployeeId == r.EmployeeId &&
                        b.LeaveTypeId == r.LeaveTypeId &&
                        b.Year == r.DateFrom.Year, ct);

                if (balance is not null)
                {
                    balance.UsedDays += r.TotalDays;
                    balance.PendingDays -= r.TotalDays;
                }
                break;

            default:
                throw new ConflictException("INVALID_STATUS", "คำขอนี้ไม่อยู่ในสถานะรออนุมัติ");
        }

        r.UpdatedAt = now;
        await db.SaveChangesAsync(ct);

        if (r.Status == LeaveStatus.Approved)
            await notification.EnqueueResultAsync(r.Id);

        return new LeaveRequestDto(
            r.Id,
            r.Employee.Id,
            $"{r.Employee.FirstName} {r.Employee.LastName}".Trim(),
            r.LeaveType.NameTh,
            r.DateFrom,
            r.DateTo,
            r.HalfDay,
            r.TotalDays,
            r.Reason,
            r.AttachmentUrl,
            r.Status,
            r.SupervisorComment,
            r.HrComment,
            r.CreatedAt);
    }
}
