using Hrms.Domain.Enums;

namespace Hrms.Application.Features.Expenses.Dtos;

public record ExpenseOcrStartDto(
    Guid ExpenseClaimId,
    IReadOnlyList<ExpenseOcrResultDto> Results);

public record ExpenseOcrSummaryDto(
    Guid ExpenseClaimId,
    ExpenseOcrStatus Status,
    IReadOnlyList<ExpenseOcrResultDto> Results,
    IReadOnlyDictionary<string, ExpenseOcrFieldSuggestionDto> Suggestions,
    bool CanApply);

public record ExpenseOcrResultDto(
    Guid Id,
    string AttachmentUrl,
    ExpenseAttachmentDocumentType DocumentType,
    string Provider,
    ExpenseOcrStatus Status,
    string? RawText,
    string? RawLinesJson,
    IReadOnlyDictionary<string, ExpenseOcrFieldSuggestionDto> ParsedFields,
    decimal? ConfidenceScore,
    decimal? DurationMs,
    string? Profile,
    int? MaxSide,
    string? PreprocessVariant,
    int AttemptCount,
    string? WorkerVersion,
    string? ModelVersion,
    string? ErrorMessage,
    DateTime? ProcessingStartedAt,
    DateTime? ProcessedAt,
    DateTime CreatedAt);

public record ExpenseOcrFieldSuggestionDto(
    string? Value,
    decimal? Confidence,
    string? Source,
    ExpenseAttachmentDocumentType? DocumentType,
    string? AttachmentUrl);

public record ApplyExpenseOcrRequest(
    DateOnly? ExpenseDate,
    decimal? Amount,
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
    int? TripCount);
