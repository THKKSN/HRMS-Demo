using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.ShiftOverride.Commands.RemoveEmployeeShiftOverride;

public class RemoveEmployeeShiftOverrideHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permission,
    IScopeGuard scope)
    : IRequestHandler<RemoveEmployeeShiftOverrideCommand, Unit>
{
    public async Task<Unit> Handle(RemoveEmployeeShiftOverrideCommand request, CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permission, "attendance:manage", ct);

        var entry = await db.EmployeeShiftOverrides
            .Include(o => o.Employee)
            .FirstOrDefaultAsync(o => o.Id == request.OverrideId && o.IsActive, ct)
            ?? throw new KeyNotFoundException("ไม่พบข้อมูล override ที่ระบุ");

        await scope.ThrowIfCannotAccessAsync(entry.Employee.CompanyId, ct);

        entry.IsActive = false;
        await db.SaveChangesAsync(ct);

        return Unit.Value;
    }
}
