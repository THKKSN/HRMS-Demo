using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.ExpenseBillingBatches.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.ExpenseBillingBatches.Queries;

public record GetExpenseBillingBatchByIdQuery(Guid Id) : IRequest<ExpenseBillingBatchDto>;

public class GetExpenseBillingBatchByIdHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permService) : IRequestHandler<GetExpenseBillingBatchByIdQuery, ExpenseBillingBatchDto>
{
    public async Task<ExpenseBillingBatchDto> Handle(GetExpenseBillingBatchByIdQuery request, CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permService, "expense:view-all", ct);

        var batch = await db.ExpenseBillingBatches
            .AsNoTracking()
            .Include(x => x.CreatedByEmployee)
            .Include(x => x.Items)
                .ThenInclude(x => x.ExpenseClaim)
                    .ThenInclude(x => x.Employee)
            .FirstOrDefaultAsync(x => x.Id == request.Id, ct)
            ?? throw new KeyNotFoundException("ไม่พบรอบวางบิล");

        return ExpenseBillingBatchMapper.ToDto(batch);
    }
}
