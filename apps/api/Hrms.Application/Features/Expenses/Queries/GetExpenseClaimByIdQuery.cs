using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Expenses.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Expenses.Queries;

public record GetExpenseClaimByIdQuery(Guid Id) : IRequest<ExpenseClaimDto>;

public class GetExpenseClaimByIdHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permService)
    : IRequestHandler<GetExpenseClaimByIdQuery, ExpenseClaimDto>
{
    public async Task<ExpenseClaimDto> Handle(GetExpenseClaimByIdQuery request, CancellationToken ct)
    {
        var employeeId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

        var claim = await db.ExpenseClaims
            .Include(x => x.Employee)
            .FirstOrDefaultAsync(x => x.Id == request.Id, ct)
            ?? throw new KeyNotFoundException("ไม่พบรายการสร้างบิล");

        var canViewOwn = claim.EmployeeId == employeeId &&
            await permService.HasPermissionAsync(currentUser, "expense:view-own", ct);
        var canViewAll = await permService.HasPermissionAsync(currentUser, "expense:view-all", ct);
        var canReview = await permService.HasPermissionAsync(currentUser, "expense:review", ct);

        if (!canViewOwn && !canViewAll && !canReview)
            throw new AppForbiddenException("ไม่มีสิทธิ์ดูรายการนี้");

        return ExpenseClaimMapper.ToDto(claim);
    }
}
