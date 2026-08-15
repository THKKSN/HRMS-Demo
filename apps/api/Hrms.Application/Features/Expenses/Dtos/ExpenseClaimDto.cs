using Hrms.Domain.Enums;

namespace Hrms.Application.Features.Expenses.Dtos;

public record ExpenseClaimDto(
    Guid Id,
    Guid EmployeeId,
    string EmployeeName,
    ExpenseClaimType Type,
    ExpenseClaimStatus Status,
    DateOnly ExpenseDate,
    decimal Amount,
    string? MerchantName,
    string? BillNo,
    string? ReceiptTid,
    string? ReceiptBatch,
    string? ReceiptMid,
    string? ReceiptTrace,
    string? DriverName,
    string? VehicleNo,
    string? PlateNo,
    decimal? FuelLiters,
    string? TransportNo,
    string? Origin,
    string? CustomerName,
    int? TripCount,
    string? Note,
    IReadOnlyList<string> AttachmentUrls,
    IReadOnlyList<ExpenseAttachmentFileDto> AttachmentFiles,
    DateTime CreatedAt);

public record ExpenseAttachmentFileDto(
    string Url,
    ExpenseAttachmentDocumentType DocumentType,
    string? FileName,
    string? ContentType,
    long? SizeBytes);
