using Hrms.Domain.Entities;

namespace Hrms.Application.Features.ExpenseBillingBatches.Dtos;

internal static class ExpenseBillingBatchMapper
{
    internal static ExpenseBillingBatchListItemDto ToListItemDto(ExpenseBillingBatch batch) =>
        new(
            batch.Id,
            batch.BatchNo,
            batch.PeriodFrom,
            batch.PeriodTo,
            batch.Status,
            batch.TotalClaims,
            batch.TotalAmount,
            batch.Note,
            batch.CreatedByEmployeeId,
            $"{batch.CreatedByEmployee.FirstName} {batch.CreatedByEmployee.LastName}".Trim(),
            batch.ExportedAt,
            batch.PaidAt,
            batch.CreatedAt);

    internal static ExpenseBillingBatchDto ToDto(ExpenseBillingBatch batch) =>
        new(
            batch.Id,
            batch.BatchNo,
            batch.PeriodFrom,
            batch.PeriodTo,
            batch.Status,
            batch.TotalClaims,
            batch.TotalAmount,
            batch.Note,
            batch.CreatedByEmployeeId,
            $"{batch.CreatedByEmployee.FirstName} {batch.CreatedByEmployee.LastName}".Trim(),
            batch.ExportedAt,
            batch.PaidAt,
            batch.CreatedAt,
            batch.Items
                .OrderBy(item => item.ExpenseClaim.ExpenseDate)
                .ThenBy(item => item.ExpenseClaim.CreatedAt)
                .Select(ToItemDto)
                .ToList());

    private static ExpenseBillingBatchItemDto ToItemDto(ExpenseBillingBatchItem item)
    {
        var claim = item.ExpenseClaim;
        return new ExpenseBillingBatchItemDto(
            item.Id,
            claim.Id,
            $"{claim.Employee.FirstName} {claim.Employee.LastName}".Trim(),
            claim.Type,
            claim.Status,
            claim.ExpenseDate,
            claim.Amount,
            item.AmountSnapshot,
            claim.MerchantName,
            claim.BillNo,
            claim.ReceiptTid,
            claim.ReceiptBatch,
            claim.ReceiptMid,
            claim.ReceiptTrace,
            claim.VehicleNo,
            claim.PlateNo);
    }
}
