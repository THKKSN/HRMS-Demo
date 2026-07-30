using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Leaves.Commands.ApproveLeaveCancellation;

public class ApproveLeaveCancellationHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permService,
    IAuditLogService auditLog)
    : IRequestHandler<ApproveLeaveCancellationCommand, Unit>
{
    public async Task<Unit> Handle(ApproveLeaveCancellationCommand request, CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permService, "leave:approve-hr", ct);

        var actorId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

        var leave = await db.LeaveRequests
            .Include(r => r.Employee)
            .Include(r => r.LeaveType)
            .FirstOrDefaultAsync(r => r.Id == request.LeaveRequestId, ct)
            ?? throw new KeyNotFoundException("ไม่พบคำขอลาที่ระบุ");

        if (leave.Status != LeaveStatus.CancellationRequested)
            throw new ConflictException("INVALID_STATUS", "คำขอนี้ไม่ได้อยู่ในสถานะขอยกเลิก");

        leave.Status = LeaveStatus.Cancelled;
        leave.HrId = actorId;
        leave.HrComment = request.Comment;
        leave.HrApprovedAt = DateTime.UtcNow.AddHours(7);
        leave.UpdatedAt = DateTime.UtcNow.AddHours(7);

        // คืนวันลาที่ตัดไปแล้ว
        var balance = await db.LeaveBalances
            .FirstOrDefaultAsync(b =>
                b.EmployeeId == leave.EmployeeId &&
                b.LeaveTypeId == leave.LeaveTypeId &&
                b.Year == leave.DateFrom.Year, ct);

        if (balance is not null)
            balance.UsedDays -= leave.TotalDays;

        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module:      "leave",
            entityType:  "LeaveRequest",
            entityId:    leave.Id.ToString(),
            action:      "approve-cancel",
            description: $"อนุมัติการยกเลิกการลาของ {leave.Employee.FirstName} {leave.Employee.LastName} ({leave.LeaveType.NameTh} {leave.DateFrom:yyyy-MM-dd} ถึง {leave.DateTo:yyyy-MM-dd}) คืนวันลา {leave.TotalDays} วัน",
            oldValues:   new { status = LeaveStatus.CancellationRequested.ToString() },
            newValues:   new { status = LeaveStatus.Cancelled.ToString(), comment = request.Comment },
            ct:          ct);

        return Unit.Value;
    }
}
