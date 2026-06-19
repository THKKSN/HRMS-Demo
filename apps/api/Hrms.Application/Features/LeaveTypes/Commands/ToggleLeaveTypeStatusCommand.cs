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
            ?? throw new KeyNotFoundException("à¹„à¸¡à¹ˆà¸žà¸šà¸›à¸£à¸°à¹€à¸ à¸—à¸à¸²à¸£à¸¥à¸²");

        await scope.ThrowIfCannotAccessAsync(leaveType.CompanyId);

        // à¸›à¹‰à¸­à¸‡à¸à¸±à¸™ deactivate à¸–à¹‰à¸²à¸¡à¸µ leave request / balance active à¸­à¸¢à¸¹à¹ˆ
        if (!request.IsActive)
        {
            var hasActive = await db.LeaveRequests.AnyAsync(r =>
                r.LeaveTypeId == request.Id &&
                (r.Status == Domain.Enums.LeaveStatus.PendingSupervisor ||
                 r.Status == Domain.Enums.LeaveStatus.PendingHr), ct);

            if (hasActive)
                throw new ConflictException("IN_USE", "à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¸›à¸´à¸”à¸›à¸£à¸°à¹€à¸ à¸—à¸¥à¸²à¸™à¸µà¹‰à¹„à¸”à¹‰ à¹€à¸™à¸·à¹ˆà¸­à¸‡à¸ˆà¸²à¸à¸¡à¸µà¸„à¸³à¸‚à¸­à¸¥à¸²à¸—à¸µà¹ˆà¸£à¸­à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´à¸­à¸¢à¸¹à¹ˆ");
        }

        leaveType.IsActive  = request.IsActive;
        leaveType.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
    }
}

