using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.LeaveTypes.Commands;

public record ToggleLeaveTypeStatusCommand(Guid Id, bool IsActive) : IRequest;

public class ToggleLeaveTypeStatusHandler(IApplicationDbContext db, IAuditLogService auditLog)
    : IRequestHandler<ToggleLeaveTypeStatusCommand>
{
    public async Task Handle(ToggleLeaveTypeStatusCommand request, CancellationToken ct)
    {
        var leaveType = await db.LeaveTypes.FirstOrDefaultAsync(lt => lt.Id == request.Id, ct)
            ?? throw new KeyNotFoundException("ไม่พบประเภทการลา");

        if (!request.IsActive)
        {
            var hasActive = await db.LeaveRequests.AnyAsync(r =>
                r.LeaveTypeId == request.Id &&
                (r.Status == Domain.Enums.LeaveStatus.PendingSupervisor ||
                 r.Status == Domain.Enums.LeaveStatus.PendingHr), ct);

            if (hasActive)
                throw new ConflictException("IN_USE", "ไม่สามารถปิดประเภทการลานี้ได้ เนื่องจากมีคำขอลาที่รออนุมัติอยู่");
        }

        var oldIsActive = leaveType.IsActive;
        leaveType.IsActive  = request.IsActive;
        leaveType.UpdatedAt = DateTime.UtcNow.AddHours(7);

        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module:      "leave-type",
            entityType:  "LeaveType",
            entityId:    leaveType.Id.ToString(),
            action:      request.IsActive ? "activate" : "deactivate",
            description: $"{(request.IsActive ? "เปิด" : "ปิด")}ใช้งานประเภทการลา '{leaveType.NameTh}'",
            oldValues:   new { isActive = oldIsActive },
            newValues:   new { isActive = request.IsActive },
            ct:          ct);
    }
}
