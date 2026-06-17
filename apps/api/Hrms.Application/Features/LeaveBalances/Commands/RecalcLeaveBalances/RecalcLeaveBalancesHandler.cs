using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.LeaveBalances.Commands.RecalcLeaveBalances;

public class RecalcLeaveBalancesHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<RecalcLeaveBalancesCommand, int>
{
    public async Task<int> Handle(RecalcLeaveBalancesCommand request, CancellationToken ct)
    {
        if (!currentUser.IsAdminOrHr())
            throw new AppForbiddenException("ต้องมีสิทธิ์ HR หรือ Admin จึงจะคำนวณวันลาได้");

        var companyId = currentUser.HasRole(Domain.Enums.RoleType.Admin) && request.CompanyId.HasValue
            ? request.CompanyId.Value
            : currentUser.CompanyId ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

        var employees = await db.Employees
            .Where(e => e.IsActive && e.CompanyId == companyId)
            .Select(e => e.Id)
            .ToListAsync(ct);

        var leaveTypes = await db.LeaveTypes
            .Where(lt => lt.IsActive && lt.CompanyId == companyId)
            .Select(lt => new { lt.Id, lt.DefaultDaysPerYear })
            .ToListAsync(ct);

        var existingBalances = await db.LeaveBalances
            .Where(b => b.Year == request.Year && employees.Contains(b.EmployeeId))
            .ToListAsync(ct);

        var existingLookup = existingBalances
            .ToDictionary(b => (b.EmployeeId, b.LeaveTypeId));

        var upsertCount = 0;

        foreach (var employeeId in employees)
        {
            foreach (var lt in leaveTypes)
            {
                if (existingLookup.TryGetValue((employeeId, lt.Id), out var existing))
                {
                    existing.TotalDays = lt.DefaultDaysPerYear;
                    existing.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    db.LeaveBalances.Add(new LeaveBalance
                    {
                        EmployeeId = employeeId,
                        LeaveTypeId = lt.Id,
                        Year = request.Year,
                        TotalDays = lt.DefaultDaysPerYear,
                        UsedDays = 0,
                        PendingDays = 0
                    });
                }
                upsertCount++;
            }
        }

        await db.SaveChangesAsync(ct);
        return upsertCount;
    }
}
