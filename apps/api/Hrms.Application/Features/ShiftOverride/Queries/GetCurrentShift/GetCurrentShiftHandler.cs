using Hrms.Application.Common.Helpers;
using Hrms.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.ShiftOverride.Queries.GetCurrentShift;

public class GetCurrentShiftHandler(IApplicationDbContext db, IScopeGuard scope)
    : IRequestHandler<GetCurrentShiftQuery, CurrentShiftDto>
{
    public async Task<CurrentShiftDto> Handle(GetCurrentShiftQuery request, CancellationToken ct)
    {
        var employee = await db.Employees
            .FirstOrDefaultAsync(e => e.Id == request.EmployeeId && e.IsActive, ct)
            ?? throw new KeyNotFoundException("ไม่พบข้อมูลพนักงาน");

        await scope.ThrowIfCannotAccessAsync(employee.CompanyId, ct);

        var today = ThaiDateTime.Today;

        // 1. Personal Override
        var ovr = await db.EmployeeShiftOverrides
            .Where(o => o.EmployeeId == request.EmployeeId
                     && o.IsActive
                     && o.EffectiveFrom <= today
                     && (o.EffectiveTo == null || o.EffectiveTo >= today))
            .OrderByDescending(o => o.EffectiveFrom)
            .Select(o => new { o.Shift.Id, o.Shift.Name, o.Shift.StartTime, o.Shift.EndTime, o.Shift.GracePeriodMinutes })
            .FirstOrDefaultAsync(ct);

        if (ovr is not null)
            return new CurrentShiftDto(ovr.Id, ovr.Name, ovr.StartTime, ovr.EndTime, ovr.GracePeriodMinutes, "override");

        // 2. Department Shift
        var deptShift = await db.Employees
            .Where(e => e.Id == request.EmployeeId && e.Department != null && e.Department.ShiftId != null)
            .Select(e => new { e.Department!.Shift!.Id, e.Department.Shift!.Name, e.Department.Shift!.StartTime, e.Department.Shift!.EndTime, e.Department.Shift!.GracePeriodMinutes })
            .FirstOrDefaultAsync(ct);

        if (deptShift is not null)
            return new CurrentShiftDto(deptShift.Id, deptShift.Name, deptShift.StartTime, deptShift.EndTime, deptShift.GracePeriodMinutes, "department");

        // 3. Company Default
        var companyShift = await db.Shifts
            .Where(s => s.CompanyId == employee.CompanyId && s.IsActive)
            .OrderBy(s => s.StartTime)
            .Select(s => new { s.Id, s.Name, s.StartTime, s.EndTime, s.GracePeriodMinutes })
            .FirstOrDefaultAsync(ct);

        if (companyShift is not null)
            return new CurrentShiftDto(companyShift.Id, companyShift.Name, companyShift.StartTime, companyShift.EndTime, companyShift.GracePeriodMinutes, "company");

        return new CurrentShiftDto(null, null, null, null, null, "none");
    }
}
