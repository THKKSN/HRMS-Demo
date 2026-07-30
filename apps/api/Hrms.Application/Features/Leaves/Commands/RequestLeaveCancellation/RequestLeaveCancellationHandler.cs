using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Leaves.Commands.RequestLeaveCancellation;

public class RequestLeaveCancellationHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IAuditLogService auditLog)
    : IRequestHandler<RequestLeaveCancellationCommand, Unit>
{
    public async Task<Unit> Handle(RequestLeaveCancellationCommand request, CancellationToken ct)
    {
        var employeeId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

        var leave = await db.LeaveRequests
            .Include(r => r.Employee)
            .Include(r => r.LeaveType)
            .FirstOrDefaultAsync(r => r.Id == request.LeaveRequestId, ct)
            ?? throw new KeyNotFoundException("ไม่พบคำขอลาที่ระบุ");

        if (leave.EmployeeId != employeeId)
            throw new AppForbiddenException("ไม่มีสิทธิ์ขอยกเลิกคำขอลาของผู้อื่น");

        if (leave.Status != LeaveStatus.Approved)
            throw new ConflictException("CANNOT_REQUEST_CANCEL", "ขอยกเลิกได้เฉพาะคำขอลาที่อนุมัติแล้วเท่านั้น");

        var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7));
        if (leave.DateFrom <= today)
            throw new ConflictException("LEAVE_ALREADY_STARTED", "ไม่สามารถยกเลิกการลาที่เริ่มต้นหรือผ่านไปแล้ว กรุณาติดต่อ HR");

        leave.Status = LeaveStatus.CancellationRequested;
        leave.CancellationReason = request.Reason;
        leave.UpdatedAt = DateTime.UtcNow.AddHours(7);

        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module:      "leave",
            entityType:  "LeaveRequest",
            entityId:    leave.Id.ToString(),
            action:      "request-cancel",
            description: $"{leave.Employee.FirstName} {leave.Employee.LastName} ขอยกเลิกการลา ({leave.LeaveType.NameTh} {leave.DateFrom:yyyy-MM-dd} ถึง {leave.DateTo:yyyy-MM-dd})",
            oldValues:   new { status = LeaveStatus.Approved.ToString() },
            newValues:   new { status = LeaveStatus.CancellationRequested.ToString(), reason = request.Reason },
            ct:          ct);

        return Unit.Value;
    }
}
