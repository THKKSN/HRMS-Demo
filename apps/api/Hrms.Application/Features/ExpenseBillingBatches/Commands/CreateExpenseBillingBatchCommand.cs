using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.ExpenseBillingBatches.Dtos;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.ExpenseBillingBatches.Commands;

public record CreateExpenseBillingBatchCommand(
    DateOnly PeriodFrom,
    DateOnly PeriodTo,
    IReadOnlyList<Guid> ExpenseClaimIds,
    string? Note) : IRequest<ExpenseBillingBatchDto>;

public class CreateExpenseBillingBatchValidator : AbstractValidator<CreateExpenseBillingBatchCommand>
{
    public CreateExpenseBillingBatchValidator()
    {
        RuleFor(x => x.PeriodFrom)
            .NotEmpty()
            .WithMessage("กรุณาระบุวันที่เริ่มรอบ");

        RuleFor(x => x.PeriodTo)
            .NotEmpty()
            .WithMessage("กรุณาระบุวันที่จบรอบ")
            .GreaterThanOrEqualTo(x => x.PeriodFrom)
            .WithMessage("วันที่จบรอบต้องไม่น้อยกว่าวันที่เริ่มรอบ");

        RuleFor(x => x.ExpenseClaimIds)
            .NotEmpty()
            .WithMessage("กรุณาเลือกรายการวางบิลอย่างน้อย 1 รายการ");

        RuleFor(x => x.Note)
            .MaximumLength(500);
    }
}

public class CreateExpenseBillingBatchHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permService,
    IAuditLogService auditLog) : IRequestHandler<CreateExpenseBillingBatchCommand, ExpenseBillingBatchDto>
{
    public async Task<ExpenseBillingBatchDto> Handle(CreateExpenseBillingBatchCommand request, CancellationToken ct)
    {
        var actorId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

        await currentUser.ThrowIfNoPermissionAsync(permService, "expense:view-all", ct);
        await currentUser.ThrowIfNoPermissionAsync(permService, "expense:create-batch", ct);

        ExpenseBillingBatchDto? result = null;
        await db.ExecuteInTransactionAsync(async token =>
        {
            var claimIds = request.ExpenseClaimIds.Distinct().ToList();
            var claims = await db.ExpenseClaims
                .Include(x => x.Employee)
                .Where(x => claimIds.Contains(x.Id))
                .ToListAsync(token);

            if (claims.Count != claimIds.Count)
                throw new KeyNotFoundException("ไม่พบรายการวางบิลบางรายการที่เลือก");

            var invalidStatus = claims.FirstOrDefault(x => x.Status != ExpenseClaimStatus.Approved);
            if (invalidStatus is not null)
                throw new ConflictException("EXPENSE_BATCH_INVALID_STATUS", "สร้างรอบวางบิลได้เฉพาะรายการที่อนุมัติแล้วเท่านั้น");

            var alreadyBatched = claims.FirstOrDefault(x => x.BillingBatchId.HasValue);
            if (alreadyBatched is not null)
                throw new ConflictException("EXPENSE_ALREADY_BATCHED", "มีรายการที่ถูกรวมรอบวางบิลแล้ว");

            var now = DateTime.UtcNow.AddHours(7);
            var batch = new ExpenseBillingBatch
            {
                BatchNo = await GenerateBatchNoAsync(request.PeriodFrom, token),
                PeriodFrom = request.PeriodFrom,
                PeriodTo = request.PeriodTo,
                Status = ExpenseBillingBatchStatus.Draft,
                TotalClaims = claims.Count,
                TotalAmount = claims.Sum(x => x.Amount),
                Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim(),
                CreatedByEmployeeId = actorId,
                CreatedBy = actorId,
                UpdatedBy = actorId,
            };

            foreach (var claim in claims)
            {
                claim.Status = ExpenseClaimStatus.Batched;
                claim.BillingBatchId = batch.Id;
                claim.BatchedAt = now;
                claim.UpdatedBy = actorId;

                batch.Items.Add(new ExpenseBillingBatchItem
                {
                    ExpenseClaimId = claim.Id,
                    AmountSnapshot = claim.Amount,
                    CreatedBy = actorId,
                    UpdatedBy = actorId,
                });
            }

            db.ExpenseBillingBatches.Add(batch);
            await db.SaveChangesAsync(token);

            var saved = await db.ExpenseBillingBatches
                .Include(x => x.CreatedByEmployee)
                .Include(x => x.Items)
                    .ThenInclude(x => x.ExpenseClaim)
                        .ThenInclude(x => x.Employee)
                .FirstAsync(x => x.Id == batch.Id, token);

            await auditLog.LogAsync(
                module: "expense",
                entityType: "ExpenseBillingBatch",
                entityId: saved.Id.ToString(),
                action: "create-expense-billing-batch",
                description: $"สร้างรอบวางบิล {saved.BatchNo} จำนวน {saved.TotalClaims} รายการ ยอดรวม {saved.TotalAmount:n2}",
                oldValues: null,
                newValues: new
                {
                    saved.BatchNo,
                    saved.PeriodFrom,
                    saved.PeriodTo,
                    saved.TotalClaims,
                    saved.TotalAmount,
                    ExpenseClaimIds = claimIds
                },
                ct: token);

            result = ExpenseBillingBatchMapper.ToDto(saved);
        }, ct);

        return result!;
    }

    private async Task<string> GenerateBatchNoAsync(DateOnly periodFrom, CancellationToken ct)
    {
        var prefix = $"EXP-{periodFrom:yyyyMM}-";
        var existing = await db.ExpenseBillingBatches
            .Where(x => x.BatchNo.StartsWith(prefix))
            .Select(x => x.BatchNo)
            .ToListAsync(ct);

        var next = existing
            .Select(value => int.TryParse(value[prefix.Length..], out var number) ? number : 0)
            .DefaultIfEmpty(0)
            .Max() + 1;

        return $"{prefix}{next:D3}";
    }
}
