using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.LeaveBalances.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.LeaveBalances.Queries.GetLeaveBalances;

public class GetLeaveBalancesHandler(IApplicationDbContext db, ICurrentUser currentUser, IScopeGuard scope)
    : IRequestHandler<GetLeaveBalancesQuery, PagedResult<LeaveBalanceAdminDto>>
{
    public async Task<PagedResult<LeaveBalanceAdminDto>> Handle(GetLeaveBalancesQuery request, CancellationToken ct)
    {
        if (!currentUser.IsAdminOrHr())
            throw new AppForbiddenException("ต้องมีสิทธิ์ HR หรือ Admin จึงจะดูวันลาของพนักงานได้");

        Guid companyId;
        if (request.CompanyId.HasValue)
        {
            await scope.ThrowIfCannotAccessAsync(request.CompanyId.Value);
            companyId = request.CompanyId.Value;
        }
        else
        {
            companyId = currentUser.CompanyId
                ?? throw new AppUnauthorizedException("UNAUTHENTICATED");
        }

        var query = db.LeaveBalances
            .Include(b => b.Employee).ThenInclude(e => e.Department)
            .Include(b => b.LeaveType)
            .Where(b => b.Year == request.Year && b.Employee.CompanyId == companyId);

        if (request.EmployeeId.HasValue)
            query = query.Where(b => b.EmployeeId == request.EmployeeId.Value);

        var totalCount = await query.CountAsync(ct);

        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 1, 2000);

        var items = await query
            .OrderBy(b => b.Employee.EmployeeCode)
            .ThenBy(b => b.LeaveType.NameTh)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(b => new LeaveBalanceAdminDto(
                b.Id,
                b.EmployeeId,
                b.Employee.EmployeeCode,
                $"{b.Employee.FirstName} {b.Employee.LastName}".Trim(),
                b.Employee.Department != null ? b.Employee.Department.Name : null,
                b.LeaveTypeId,
                b.LeaveType.NameTh,
                b.Year,
                b.TotalDays,
                b.UsedDays,
                b.PendingDays,
                b.TotalDays - b.UsedDays - b.PendingDays))
            .ToListAsync(ct);

        return new PagedResult<LeaveBalanceAdminDto>(items, totalCount, page, pageSize);
    }
}
