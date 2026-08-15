using Hrms.Domain.Enums;

namespace Hrms.Application.Common.Interfaces;

public record ExpenseOcrEngineRequest(
    Guid ExpenseClaimId,
    Guid ExpenseOcrResultId,
    string AttachmentUrl,
    ExpenseAttachmentDocumentType DocumentType);

public record ExpenseOcrEngineResult(
    string Provider,
    string RawText,
    string ParsedJson,
    string? RawLinesJson,
    decimal? ConfidenceScore,
    decimal? DurationMs,
    string? Profile,
    int? MaxSide,
    string? PreprocessVariant,
    string? WorkerVersion,
    string? ModelVersion);

public interface IExpenseOcrEngine
{
    Task<ExpenseOcrEngineResult> RecognizeAsync(
        ExpenseOcrEngineRequest request,
        CancellationToken ct = default);
}
