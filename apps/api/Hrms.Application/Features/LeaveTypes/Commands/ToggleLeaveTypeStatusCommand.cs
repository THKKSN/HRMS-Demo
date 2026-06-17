using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.LeaveTypes.Commands;

public record ToggleLeaveTypeStatusCommand(Guid Id, bool IsActive) : IRequest;

public class ToggleLeaveTypeStatusHandler(IApplicationDbContext db, IScopeGuard scope)
    : IRequestHandler<ToggleLeaveTypeStatusCommand>
{
    public async Task Handle(ToggleLeaveTypeStatusCommand request, CancellationToken ct)
    {
        var leaveType = await db.LeaveTypes.FirstOrDefaultAsync(lt => lt.Id == request.Id, ct)
            ?? throw new KeyNotFoundException("ไม่พบประเภทการลา");

        scope.ThrowIfCannotAccess(leaveType.CompanyId);

        // ป้องกัน deactivate ถ้ามี leave request / balance active อยู่
        if (!request.IsActive)
        {
            var hasActive = await db.LeaveRequests.AnyAsync(r =>
                r.LeaveTypeId == request.Id &&
                (r.Status == Domain.Enums.LeaveStatus.PendingSupervisor ||
                 r.Status == Domain.Enums.LeaveStatus.PendingHr), ct);

            if (hasActive)
                throw new ConflictException("IN_USE", "ไม่สามารถปิดประเภทลานี้ได้ เนื่องจากมีคำขอลาที่รออนุมัติอยู่");
        }

        leaveType.IsActive  = request.IsActive;
        leaveType.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
    }
}
