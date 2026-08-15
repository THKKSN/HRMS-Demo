using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Expenses.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Expenses.Queries;

public record GetExpenseOcrResultQuery(Guid Id) : IRequest<ExpenseOcrSummaryDto>;

public class GetExpenseOcrResultHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permService) : IRequestHandler<GetExpenseOcrResultQuery, ExpenseOcrSummaryDto>
{
    public async Task<ExpenseOcrSummaryDto> Handle(GetExpenseOcrResultQuery request, CancellationToken ct)
    {
        var employeeId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

        var claim = await db.ExpenseClaims
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == request.Id, ct)
            ?? throw new KeyNotFoundException("ไม่พบรายการสร้างบิล");

        var canViewOwn = claim.EmployeeId == employeeId &&
            await permService.HasPermissionAsync(currentUser, "expense:view-own", ct);
        var canViewAll = await permService.HasPermissionAsync(currentUser, "expense:view-all", ct);
        var canReview = await permService.HasPermissionAsync(currentUser, "expense:review", ct);
        if (!canViewOwn && !canViewAll && !canReview)
            throw new AppForbiddenException("ไม่มีสิทธิ์ดูผล OCR รายการนี้");

        var results = await db.ExpenseOcrResults
            .AsNoTracking()
            .Where(x => x.ExpenseClaimId == claim.Id)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(ct);

        var canApply = claim.EmployeeId == employeeId &&
            claim.Status == ExpenseClaimStatus.Draft &&
            await permService.HasPermissionAsync(currentUser, "expense:update-draft", ct);
        return ExpenseOcrMapper.ToSummary(claim.Id, results, canApply);
    }
}
