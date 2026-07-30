using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.ShiftOverride.Commands.SetEmployeeShiftOverride;

public class SetEmployeeShiftOverrideHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permission,
    IScopeGuard scope)
    : IRequestHandler<SetEmployeeShiftOverrideCommand, Guid>
{
    public async Task<Guid> Handle(SetEmployeeShiftOverrideCommand request, CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permission, "attendance:manage", ct);

        var employee = await db.Employees
            .FirstOrDefaultAsync(e => e.Id == request.EmployeeId && e.IsActive, ct)
            ?? throw new KeyNotFoundException("ไม่พบข้อมูลพนักงาน");

        await scope.ThrowIfCannotAccessAsync(employee.CompanyId, ct);

        var shift = await db.Shifts
            .FirstOrDefaultAsync(s => s.Id == request.ShiftId && s.IsActive, ct)
            ?? throw new KeyNotFoundException("ไม่พบข้อมูลกะการทำงาน");

        if (request.EffectiveTo.HasValue && request.EffectiveTo < request.EffectiveFrom)
            throw new ArgumentException("วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น");

        // deactivate overlapping overrides for the same employee
        var overlapping = await db.EmployeeShiftOverrides
            .Where(o => o.EmployeeId == request.EmployeeId
                     && o.IsActive
                     && (o.EffectiveTo == null || o.EffectiveTo >= request.EffectiveFrom)
                     && o.EffectiveFrom <= (request.EffectiveTo ?? DateOnly.MaxValue))
            .ToListAsync(ct);

        foreach (var o in overlapping)
            o.IsActive = false;

        var newOverride = new EmployeeShiftOverride
        {
            EmployeeId     = request.EmployeeId,
            ShiftId        = request.ShiftId,
            EffectiveFrom  = request.EffectiveFrom,
            EffectiveTo    = request.EffectiveTo,
            Reason         = request.Reason,
            CreatedByHrId  = currentUser.EmployeeId!.Value,
            IsActive       = true,
        };

        db.EmployeeShiftOverrides.Add(newOverride);
        await db.SaveChangesAsync(ct);

        return newOverride.Id;
    }
}
