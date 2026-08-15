using Hrms.Domain.Enums;

namespace Hrms.Application.Features.ExpenseBillingBatches.Dtos;

public record ExpenseBillingBatchListItemDto(
    Guid Id,
    string BatchNo,
    DateOnly PeriodFrom,
    DateOnly PeriodTo,
    ExpenseBillingBatchStatus Status,
    int TotalClaims,
    decimal TotalAmount,
    string? Note,
    Guid CreatedByEmployeeId,
    string CreatedByEmployeeName,
    DateTime? ExportedAt,
    DateTime? PaidAt,
    DateTime CreatedAt);

public record ExpenseBillingBatchItemDto(
    Guid Id,
    Guid ExpenseClaimId,
    string EmployeeName,
    ExpenseClaimType Type,
    ExpenseClaimStatus Status,
    DateOnly ExpenseDate,
    decimal Amount,
    decimal AmountSnapshot,
    string? MerchantName,
    string? BillNo,
    string? ReceiptTid,
    string? ReceiptBatch,
    string? ReceiptMid,
    string? ReceiptTrace,
    string? VehicleNo,
    string? PlateNo);

public record ExpenseBillingBatchDto(
    Guid Id,
    string BatchNo,
    DateOnly PeriodFrom,
    DateOnly PeriodTo,
    ExpenseBillingBatchStatus Status,
    int TotalClaims,
    decimal TotalAmount,
    string? Note,
    Guid CreatedByEmployeeId,
    string CreatedByEmployeeName,
    DateTime? ExportedAt,
    DateTime? PaidAt,
    DateTime CreatedAt,
    IReadOnlyList<ExpenseBillingBatchItemDto> Items);
