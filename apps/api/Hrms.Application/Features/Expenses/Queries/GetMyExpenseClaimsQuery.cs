using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.Expenses.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Expenses.Queries;

public record GetMyExpenseClaimsQuery(
    ExpenseClaimStatus? Status = null,
    int Page = 1,
    int PageSize = 20) : IRequest<PagedResult<ExpenseClaimDto>>;

public class GetMyExpenseClaimsHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permService)
    : IRequestHandler<GetMyExpenseClaimsQuery, PagedResult<ExpenseClaimDto>>
{
    public async Task<PagedResult<ExpenseClaimDto>> Handle(GetMyExpenseClaimsQuery request, CancellationToken ct)
    {
        var employeeId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");
        if (!await permService.HasPermissionAsync(currentUser, "expense:view-own", ct))
            throw new AppForbiddenException("ไม่มีสิทธิ์: expense:view-own");

        var query = db.ExpenseClaims
            .Include(x => x.Employee)
            .Where(x => x.EmployeeId == employeeId);

        if (request.Status.HasValue)
            query = query.Where(x => x.Status == request.Status.Value);

        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 1, 50);
        var totalCount = await query.CountAsync(ct);

        var claims = await query
            .OrderByDescending(x => x.ExpenseDate)
            .ThenByDescending(x => x.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);
        var items = claims.Select(ExpenseClaimMapper.ToDto).ToList();

        return new PagedResult<ExpenseClaimDto>(items, totalCount, page, pageSize);
    }
}
