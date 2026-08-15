using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.ExpenseBillingBatches.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.ExpenseBillingBatches.Commands;

public record ExportExpenseBillingBatchCommand(Guid Id) : IRequest<ExpenseBillingBatchExportResult>;

public record MarkExpenseBillingBatchPaidCommand(Guid Id) : IRequest<ExpenseBillingBatchDto>;

public record CancelExpenseBillingBatchCommand(Guid Id) : IRequest<ExpenseBillingBatchDto>;

public record ExpenseBillingBatchExportResult(
    byte[] Content,
    string FileName,
    string ContentType,
    int RowCount);

public class MarkExpenseBillingBatchPaidHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permService,
    IAuditLogService auditLog) : IRequestHandler<MarkExpenseBillingBatchPaidCommand, ExpenseBillingBatchDto>
{
    public async Task<ExpenseBillingBatchDto> Handle(MarkExpenseBillingBatchPaidCommand request, CancellationToken ct)
    {
        var actorId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

        await currentUser.ThrowIfNoPermissionAsync(permService, "expense:view-all", ct);
        await currentUser.ThrowIfNoPermissionAsync(permService, "expense:mark-paid", ct);

        var now = DateTime.UtcNow.AddHours(7);
        var batch = await db.ExpenseBillingBatches
            .Include(x => x.CreatedByEmployee)
            .Include(x => x.Items)
                .ThenInclude(x => x.ExpenseClaim)
                    .ThenInclude(x => x.Employee)
            .FirstOrDefaultAsync(x => x.Id == request.Id, ct)
            ?? throw new KeyNotFoundException("ไม่พบรอบวางบิล");

        if (batch.Status == ExpenseBillingBatchStatus.Cancelled)
            throw new ConflictException("EXPENSE_BATCH_CANCELLED", "ไม่สามารถ mark paid รอบวางบิลที่ยกเลิกแล้ว");

        if (batch.Status == ExpenseBillingBatchStatus.Paid)
            throw new ConflictException("EXPENSE_BATCH_ALREADY_PAID", "รอบวางบิลนี้จ่ายแล้ว");

        var oldStatus = batch.Status;
        batch.Status = ExpenseBillingBatchStatus.Paid;
        batch.PaidAt = now;
        batch.UpdatedBy = actorId;

        foreach (var item in batch.Items)
        {
            item.ExpenseClaim.Status = ExpenseClaimStatus.Paid;
            item.ExpenseClaim.PaidAt = now;
            item.ExpenseClaim.UpdatedBy = actorId;
        }

        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module: "expense",
            entityType: "ExpenseBillingBatch",
            entityId: batch.Id.ToString(),
            action: "mark-expense-billing-batch-paid",
            description: $"บันทึกจ่ายเงินรอบวางบิล {batch.BatchNo} จำนวน {batch.TotalClaims} รายการ",
            oldValues: new { status = oldStatus.ToString() },
            newValues: new { status = batch.Status.ToString(), batch.PaidAt },
            ct: ct);

        return ExpenseBillingBatchMapper.ToDto(batch);
    }
}

public class CancelExpenseBillingBatchHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permService,
    IAuditLogService auditLog) : IRequestHandler<CancelExpenseBillingBatchCommand, ExpenseBillingBatchDto>
{
    public async Task<ExpenseBillingBatchDto> Handle(CancelExpenseBillingBatchCommand request, CancellationToken ct)
    {
        var actorId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

        await currentUser.ThrowIfNoPermissionAsync(permService, "expense:view-all", ct);
        await currentUser.ThrowIfNoPermissionAsync(permService, "expense:create-batch", ct);

        var batch = await db.ExpenseBillingBatches
            .Include(x => x.CreatedByEmployee)
            .Include(x => x.Items)
                .ThenInclude(x => x.ExpenseClaim)
                    .ThenInclude(x => x.Employee)
            .FirstOrDefaultAsync(x => x.Id == request.Id, ct)
            ?? throw new KeyNotFoundException("ไม่พบรอบวางบิล");

        if (batch.Status == ExpenseBillingBatchStatus.Paid)
            throw new ConflictException("EXPENSE_BATCH_PAID", "ไม่สามารถยกเลิกรอบวางบิลที่จ่ายแล้ว");

        if (batch.Status == ExpenseBillingBatchStatus.Cancelled)
            throw new ConflictException("EXPENSE_BATCH_ALREADY_CANCELLED", "รอบวางบิลนี้ถูกยกเลิกแล้ว");

        var oldStatus = batch.Status;
        batch.Status = ExpenseBillingBatchStatus.Cancelled;
        batch.UpdatedBy = actorId;

        foreach (var item in batch.Items)
        {
            item.ExpenseClaim.Status = ExpenseClaimStatus.Approved;
            item.ExpenseClaim.BillingBatchId = null;
            item.ExpenseClaim.BatchedAt = null;
            item.ExpenseClaim.UpdatedBy = actorId;
        }

        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module: "expense",
            entityType: "ExpenseBillingBatch",
            entityId: batch.Id.ToString(),
            action: "cancel-expense-billing-batch",
            description: $"ยกเลิกรอบวางบิล {batch.BatchNo} และคืนรายการเป็น Approved",
            oldValues: new { status = oldStatus.ToString() },
            newValues: new { status = batch.Status.ToString(), RestoredClaimIds = batch.Items.Select(x => x.ExpenseClaimId).ToList() },
            ct: ct);

        return ExpenseBillingBatchMapper.ToDto(batch);
    }
}
