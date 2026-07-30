using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Leaves.Commands.CancelLeaveRequest;

public class CancelLeaveRequestHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permService,
    IAuditLogService auditLog)
    : IRequestHandler<CancelLeaveRequestCommand, Unit>
{
    public async Task<Unit> Handle(CancelLeaveRequestCommand request, CancellationToken ct)
    {
        var employeeId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

        var leaveRequest = await db.LeaveRequests
            .Include(r => r.Employee)
            .Include(r => r.LeaveType)
            .FirstOrDefaultAsync(r => r.Id == request.LeaveRequestId, ct)
            ?? throw new KeyNotFoundException("ไม่พบคำขอลาที่ระบุ");

        var isOwner          = leaveRequest.EmployeeId == employeeId;
        var canCancelForOthers = await permService.HasPermissionAsync(currentUser, "leave:approve-hr", ct);

        if (!isOwner && !canCancelForOthers)
            throw new AppForbiddenException("ไม่มีสิทธิ์ยกเลิกคำขอลานี้");

        if (leaveRequest.Status != LeaveStatus.PendingSupervisor && leaveRequest.Status != LeaveStatus.PendingHr)
            throw new ConflictException("CANNOT_CANCEL", "ยกเลิกได้เฉพาะคำขอที่อยู่ในสถานะรออนุมัติเท่านั้น");

        leaveRequest.Status = LeaveStatus.Cancelled;
        leaveRequest.UpdatedAt = DateTime.UtcNow.AddHours(7);

        var balance = await db.LeaveBalances
            .FirstOrDefaultAsync(b =>
                b.EmployeeId == leaveRequest.EmployeeId &&
                b.LeaveTypeId == leaveRequest.LeaveTypeId &&
                b.Year == leaveRequest.DateFrom.Year, ct);

        if (balance is not null)
            balance.PendingDays -= leaveRequest.TotalDays;

        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module:      "leave",
            entityType:  "LeaveRequest",
            entityId:    leaveRequest.Id.ToString(),
            action:      "cancel",
            description: $"ยกเลิกคำขอลาของ {leaveRequest.Employee.FirstName} {leaveRequest.Employee.LastName} ({leaveRequest.LeaveType.NameTh} {leaveRequest.DateFrom:yyyy-MM-dd} ถึง {leaveRequest.DateTo:yyyy-MM-dd})",
            oldValues:   null,
            newValues:   new { status = LeaveStatus.Cancelled.ToString() },
            ct:          ct);

        return Unit.Value;
    }
}
