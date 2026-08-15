using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.ExpenseBillingBatches.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.ExpenseBillingBatches.Queries;

public record GetExpenseBillingBatchesQuery(
    ExpenseBillingBatchStatus? Status = null,
    DateOnly? DateFrom = null,
    DateOnly? DateTo = null,
    string? BatchNo = null,
    int Page = 1,
    int PageSize = 20) : IRequest<PagedResult<ExpenseBillingBatchListItemDto>>;

public class GetExpenseBillingBatchesHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permService) : IRequestHandler<GetExpenseBillingBatchesQuery, PagedResult<ExpenseBillingBatchListItemDto>>
{
    public async Task<PagedResult<ExpenseBillingBatchListItemDto>> Handle(GetExpenseBillingBatchesQuery request, CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permService, "expense:view-all", ct);

        var query = db.ExpenseBillingBatches
            .AsNoTracking()
            .Include(x => x.CreatedByEmployee)
            .AsQueryable();

        if (request.Status.HasValue)
            query = query.Where(x => x.Status == request.Status.Value);

        if (request.DateFrom.HasValue)
            query = query.Where(x => x.PeriodTo >= request.DateFrom.Value);

        if (request.DateTo.HasValue)
            query = query.Where(x => x.PeriodFrom <= request.DateTo.Value);

        var batchNo = request.BatchNo?.Trim();
        if (!string.IsNullOrWhiteSpace(batchNo))
            query = query.Where(x => EF.Functions.Like(x.BatchNo, $"%{batchNo}%"));

        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 1, 100);
        var totalCount = await query.CountAsync(ct);

        var batches = await query
            .OrderByDescending(x => x.PeriodFrom)
            .ThenByDescending(x => x.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return new PagedResult<ExpenseBillingBatchListItemDto>(
            batches.Select(ExpenseBillingBatchMapper.ToListItemDto).ToList(),
            totalCount,
            page,
            pageSize);
    }
}
