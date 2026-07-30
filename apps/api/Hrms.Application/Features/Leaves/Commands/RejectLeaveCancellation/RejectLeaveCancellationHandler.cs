using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Leaves.Commands.RejectLeaveCancellation;

public class RejectLeaveCancellationHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permService,
    IAuditLogService auditLog)
    : IRequestHandler<RejectLeaveCancellationCommand, Unit>
{
    public async Task<Unit> Handle(RejectLeaveCancellationCommand request, CancellationToken ct)
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

        // คืนกลับเป็น Approved (ปฏิเสธการยกเลิก = ยังลาอยู่)
        leave.Status = LeaveStatus.Approved;
        leave.CancellationReason = null;
        leave.HrId = actorId;
        leave.HrComment = request.Comment;
        leave.UpdatedAt = DateTime.UtcNow.AddHours(7);

        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module:      "leave",
            entityType:  "LeaveRequest",
            entityId:    leave.Id.ToString(),
            action:      "reject-cancel",
            description: $"ปฏิเสธการยกเลิกการลาของ {leave.Employee.FirstName} {leave.Employee.LastName} ({leave.LeaveType.NameTh} {leave.DateFrom:yyyy-MM-dd} ถึง {leave.DateTo:yyyy-MM-dd}) คืนกลับสถานะอนุมัติ",
            oldValues:   new { status = LeaveStatus.CancellationRequested.ToString() },
            newValues:   new { status = LeaveStatus.Approved.ToString(), comment = request.Comment },
            ct:          ct);

        return Unit.Value;
    }
}
