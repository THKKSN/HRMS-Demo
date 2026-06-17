using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Leaves.Commands.CancelLeaveRequest;

public class CancelLeaveRequestHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<CancelLeaveRequestCommand, Unit>
{
    public async Task<Unit> Handle(CancelLeaveRequestCommand request, CancellationToken ct)
    {
        var employeeId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

        var leaveRequest = await db.LeaveRequests
            .FirstOrDefaultAsync(r => r.Id == request.LeaveRequestId, ct)
            ?? throw new KeyNotFoundException("ไม่พบคำขอลาที่ระบุ");

        var isOwner = leaveRequest.EmployeeId == employeeId;
        var isHr = currentUser.IsAdminOrHr();

        if (!isOwner && !isHr)
            throw new AppForbiddenException("ไม่มีสิทธิ์ยกเลิกคำขอลานี้");

        if (leaveRequest.Status != LeaveStatus.PendingSupervisor && leaveRequest.Status != LeaveStatus.PendingHr)
            throw new ConflictException("CANNOT_CANCEL", "ยกเลิกได้เฉพาะคำขอที่อยู่ในสถานะรออนุมัติเท่านั้น");

        leaveRequest.Status = LeaveStatus.Cancelled;
        leaveRequest.UpdatedAt = DateTime.UtcNow;

        var balance = await db.LeaveBalances
            .FirstOrDefaultAsync(b =>
                b.EmployeeId == leaveRequest.EmployeeId &&
                b.LeaveTypeId == leaveRequest.LeaveTypeId &&
                b.Year == leaveRequest.DateFrom.Year, ct);

        if (balance is not null)
            balance.PendingDays -= leaveRequest.TotalDays;

        await db.SaveChangesAsync(ct);

        return Unit.Value;
    }
}
