using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Employees.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Employees.GetMeLeaveBalance;

public record GetMeLeaveBalanceQuery(int Year) : IRequest<IReadOnlyList<LeaveBalanceDto>>;

public class GetMeLeaveBalanceHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<GetMeLeaveBalanceQuery, IReadOnlyList<LeaveBalanceDto>>
{
    public async Task<IReadOnlyList<LeaveBalanceDto>> Handle(GetMeLeaveBalanceQuery request, CancellationToken ct)
    {
        var employeeId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("Not authenticated.");

        var balances = await db.LeaveBalances
            .Include(b => b.LeaveType)
            .Where(b => b.EmployeeId == employeeId && b.Year == request.Year)
            .OrderBy(b => b.LeaveType.NameTh)
            .ToListAsync(ct);

        return balances
            .Select(b => new LeaveBalanceDto(
                b.LeaveTypeId,
                b.LeaveType.NameTh,
                b.Year,
                b.TotalDays,
                b.UsedDays,
                b.PendingDays,
                b.RemainingDays))
            .ToList();
    }
}
