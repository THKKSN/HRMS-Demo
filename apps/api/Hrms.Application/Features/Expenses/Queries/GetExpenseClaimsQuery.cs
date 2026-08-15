using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.Expenses.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Expenses.Queries;

public record GetExpenseClaimsQuery(
    ExpenseClaimStatus? Status = null,
    ExpenseClaimType? Type = null,
    Guid? EmployeeId = null,
    string? EmployeeSearch = null,
    DateOnly? DateFrom = null,
    DateOnly? DateTo = null,
    int Page = 1,
    int PageSize = 20) : IRequest<PagedResult<ExpenseClaimDto>>;

public class GetExpenseClaimsHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permService)
    : IRequestHandler<GetExpenseClaimsQuery, PagedResult<ExpenseClaimDto>>
{
    public async Task<PagedResult<ExpenseClaimDto>> Handle(GetExpenseClaimsQuery request, CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permService, "expense:view-all", ct);

        var query = db.ExpenseClaims
            .Include(x => x.Employee)
            .AsQueryable();

        if (request.Status.HasValue)
            query = query.Where(x => x.Status == request.Status.Value);

        if (request.Type.HasValue)
            query = query.Where(x => x.Type == request.Type.Value);

        if (request.EmployeeId.HasValue)
            query = query.Where(x => x.EmployeeId == request.EmployeeId.Value);

        if (!string.IsNullOrWhiteSpace(request.EmployeeSearch))
        {
            var search = request.EmployeeSearch.Trim();
            query = query.Where(x =>
                x.Employee.EmployeeCode.Contains(search) ||
                x.Employee.FirstName.Contains(search) ||
                x.Employee.LastName.Contains(search));
        }

        if (request.DateFrom.HasValue)
            query = query.Where(x => x.ExpenseDate >= request.DateFrom.Value);

        if (request.DateTo.HasValue)
            query = query.Where(x => x.ExpenseDate <= request.DateTo.Value);

        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 1, 100);
        var totalCount = await query.CountAsync(ct);

        var claims = await query
            .OrderBy(x => x.Status == ExpenseClaimStatus.Pending ? 0 : x.Status == ExpenseClaimStatus.Draft ? 1 : 2)
            .ThenByDescending(x => x.ExpenseDate)
            .ThenByDescending(x => x.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return new PagedResult<ExpenseClaimDto>(
            claims.Select(ExpenseClaimMapper.ToDto).ToList(),
            totalCount,
            page,
            pageSize);
    }
}
