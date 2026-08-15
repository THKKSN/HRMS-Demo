using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Expenses.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Expenses.Commands;

public record ApproveExpenseClaimCommand(Guid Id, string? Comment) : IRequest<ExpenseClaimDto>;

public record RejectExpenseClaimCommand(Guid Id, string Comment) : IRequest<ExpenseClaimDto>;

public class RejectExpenseClaimValidator : AbstractValidator<RejectExpenseClaimCommand>
{
    public RejectExpenseClaimValidator()
    {
        RuleFor(x => x.Comment)
            .NotEmpty()
            .WithMessage("กรุณาระบุเหตุผลการปฏิเสธ")
            .MaximumLength(500);
    }
}

public class ApproveExpenseClaimHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permService,
    IAuditLogService auditLog) : IRequestHandler<ApproveExpenseClaimCommand, ExpenseClaimDto>
{
    public async Task<ExpenseClaimDto> Handle(ApproveExpenseClaimCommand request, CancellationToken ct)
    {
        var actorId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");
        await currentUser.ThrowIfNoPermissionAsync(permService, "expense:review", ct);

        var claim = await db.ExpenseClaims
            .Include(x => x.Employee)
            .FirstOrDefaultAsync(x => x.Id == request.Id, ct)
            ?? throw new KeyNotFoundException("ไม่พบรายการสร้างบิล");

        if (claim.Status != ExpenseClaimStatus.Pending)
            throw new ConflictException("EXPENSE_NOT_PENDING", "อนุมัติได้เฉพาะรายการที่รอตรวจเท่านั้น");

        var oldStatus = claim.Status;
        claim.Status = ExpenseClaimStatus.Approved;
        claim.UpdatedBy = actorId;

        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module: "expense",
            entityType: "ExpenseClaim",
            entityId: claim.Id.ToString(),
            action: "approve",
            description: $"อนุมัติรายการสร้างบิลของ {claim.Employee.FirstName} {claim.Employee.LastName} วันที่ {claim.ExpenseDate:yyyy-MM-dd} จำนวน {claim.Amount:n2}",
            oldValues: new { status = oldStatus.ToString() },
            newValues: new { status = claim.Status.ToString(), comment = request.Comment },
            ct: ct);

        return ExpenseClaimMapper.ToDto(claim);
    }
}

public class RejectExpenseClaimHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permService,
    IAuditLogService auditLog) : IRequestHandler<RejectExpenseClaimCommand, ExpenseClaimDto>
{
    public async Task<ExpenseClaimDto> Handle(RejectExpenseClaimCommand request, CancellationToken ct)
    {
        var actorId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");
        await currentUser.ThrowIfNoPermissionAsync(permService, "expense:review", ct);

        var claim = await db.ExpenseClaims
            .Include(x => x.Employee)
            .FirstOrDefaultAsync(x => x.Id == request.Id, ct)
            ?? throw new KeyNotFoundException("ไม่พบรายการสร้างบิล");

        if (claim.Status != ExpenseClaimStatus.Pending)
            throw new ConflictException("EXPENSE_NOT_PENDING", "ปฏิเสธได้เฉพาะรายการที่รอตรวจเท่านั้น");

        var oldStatus = claim.Status;
        claim.Status = ExpenseClaimStatus.Rejected;
        claim.UpdatedBy = actorId;

        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module: "expense",
            entityType: "ExpenseClaim",
            entityId: claim.Id.ToString(),
            action: "reject",
            description: $"ปฏิเสธรายการสร้างบิลของ {claim.Employee.FirstName} {claim.Employee.LastName} วันที่ {claim.ExpenseDate:yyyy-MM-dd} จำนวน {claim.Amount:n2}",
            oldValues: new { status = oldStatus.ToString() },
            newValues: new { status = claim.Status.ToString(), comment = request.Comment },
            ct: ct);

        return ExpenseClaimMapper.ToDto(claim);
    }
}
