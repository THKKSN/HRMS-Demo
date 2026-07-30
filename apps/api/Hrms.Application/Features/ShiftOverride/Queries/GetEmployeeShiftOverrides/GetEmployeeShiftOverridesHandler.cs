using Hrms.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.ShiftOverride.Queries.GetEmployeeShiftOverrides;

public class GetEmployeeShiftOverridesHandler(IApplicationDbContext db, IScopeGuard scope)
    : IRequestHandler<GetEmployeeShiftOverridesQuery, List<ShiftOverrideDto>>
{
    public async Task<List<ShiftOverrideDto>> Handle(GetEmployeeShiftOverridesQuery request, CancellationToken ct)
    {
        var employee = await db.Employees
            .FirstOrDefaultAsync(e => e.Id == request.EmployeeId && e.IsActive, ct)
            ?? throw new KeyNotFoundException("ไม่พบข้อมูลพนักงาน");

        await scope.ThrowIfCannotAccessAsync(employee.CompanyId, ct);

        return await db.EmployeeShiftOverrides
            .Where(o => o.EmployeeId == request.EmployeeId)
            .OrderByDescending(o => o.EffectiveFrom)
            .Select(o => new ShiftOverrideDto(
                o.Id,
                o.ShiftId,
                o.Shift.Name,
                o.Shift.StartTime,
                o.Shift.EndTime,
                o.EffectiveFrom,
                o.EffectiveTo,
                o.Reason,
                o.IsActive,
                o.CreatedAt))
            .ToListAsync(ct);
    }
}
