using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Infrastructure.Services;

public class ShiftResolverService(IApplicationDbContext db) : IShiftResolver
{
    public async Task<Shift?> ResolveAsync(Guid employeeId, DateOnly date, CancellationToken ct = default)
    {
        // 1. Personal Override (active, date in range)
        var overrideShiftId = await db.EmployeeShiftOverrides
            .Where(o => o.EmployeeId == employeeId
                     && o.IsActive
                     && o.EffectiveFrom <= date
                     && (o.EffectiveTo == null || o.EffectiveTo >= date))
            .OrderByDescending(o => o.EffectiveFrom)
            .Select(o => (Guid?)o.ShiftId)
            .FirstOrDefaultAsync(ct);

        if (overrideShiftId.HasValue)
            return await db.Shifts.FirstOrDefaultAsync(s => s.Id == overrideShiftId.Value && s.IsActive, ct);

        // 2. Department Shift
        var deptShiftId = await db.Employees
            .Where(e => e.Id == employeeId)
            .Select(e => e.Department != null ? e.Department.ShiftId : null)
            .FirstOrDefaultAsync(ct);

        if (deptShiftId.HasValue)
            return await db.Shifts.FirstOrDefaultAsync(s => s.Id == deptShiftId.Value && s.IsActive, ct);

        // 3. Company Default (first active shift)
        var companyId = await db.Employees
            .Where(e => e.Id == employeeId)
            .Select(e => e.CompanyId)
            .FirstOrDefaultAsync(ct);

        return await db.Shifts
            .Where(s => s.CompanyId == companyId && s.IsActive)
            .OrderBy(s => s.StartTime)
            .FirstOrDefaultAsync(ct);
    }
}
