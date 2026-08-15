using Hrms.Domain.Common;
using Hrms.Domain.Enums;

namespace Hrms.Domain.Entities;

public class ExpenseOcrResult : BaseEntity
{
    public Guid ExpenseClaimId { get; set; }
    public string AttachmentUrl { get; set; } = string.Empty;
    public ExpenseAttachmentDocumentType DocumentType { get; set; } = ExpenseAttachmentDocumentType.Other;
    public string Provider { get; set; } = "PaddleOCR";
    public ExpenseOcrStatus Status { get; set; } = ExpenseOcrStatus.Pending;
    public string? RawText { get; set; }
    public string? RawLinesJson { get; set; }
    public string? ParsedJson { get; set; }
    public decimal? ConfidenceScore { get; set; }
    public decimal? DurationMs { get; set; }
    public string? Profile { get; set; }
    public int? MaxSide { get; set; }
    public string? PreprocessVariant { get; set; }
    public int AttemptCount { get; set; }
    public string? WorkerVersion { get; set; }
    public string? ModelVersion { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime? ProcessingStartedAt { get; set; }
    public DateTime? ProcessedAt { get; set; }

    public ExpenseClaim ExpenseClaim { get; set; } = null!;
}
