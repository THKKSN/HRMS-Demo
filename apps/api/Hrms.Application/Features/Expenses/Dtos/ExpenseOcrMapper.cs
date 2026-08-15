using System.Text.Json;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;

namespace Hrms.Application.Features.Expenses.Dtos;

internal static class ExpenseOcrMapper
{
    private static readonly IReadOnlyDictionary<string, ExpenseAttachmentDocumentType[]> FieldSourcePriority =
        new Dictionary<string, ExpenseAttachmentDocumentType[]>(StringComparer.OrdinalIgnoreCase)
        {
            ["expenseDate"] = [ExpenseAttachmentDocumentType.PaymentOrder, ExpenseAttachmentDocumentType.Receipt],
            ["billNo"] = [ExpenseAttachmentDocumentType.PaymentOrder],
            ["driverName"] = [ExpenseAttachmentDocumentType.PaymentOrder],
            ["vehicleNo"] = [ExpenseAttachmentDocumentType.PaymentOrder],
            ["plateNo"] = [ExpenseAttachmentDocumentType.PaymentOrder],
            ["fuelLiters"] = [ExpenseAttachmentDocumentType.PaymentOrder],
            ["transportNo"] = [ExpenseAttachmentDocumentType.PaymentOrder],
            ["origin"] = [ExpenseAttachmentDocumentType.PaymentOrder],
            ["customerName"] = [ExpenseAttachmentDocumentType.PaymentOrder],
            ["tripCount"] = [ExpenseAttachmentDocumentType.PaymentOrder],
            ["amount"] = [ExpenseAttachmentDocumentType.Receipt],
            ["merchantName"] = [ExpenseAttachmentDocumentType.Receipt],
            ["receiptTid"] = [ExpenseAttachmentDocumentType.Receipt],
            ["receiptBatch"] = [ExpenseAttachmentDocumentType.Receipt],
            ["receiptMid"] = [ExpenseAttachmentDocumentType.Receipt],
            ["receiptTrace"] = [ExpenseAttachmentDocumentType.Receipt],
        };

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    internal static ExpenseOcrResultDto ToDto(ExpenseOcrResult result)
    {
        var fields = ParseFields(result.ParsedJson, result.DocumentType, result.AttachmentUrl);
        return new ExpenseOcrResultDto(
            result.Id,
            result.AttachmentUrl,
            result.DocumentType,
            result.Provider,
            result.Status,
            result.RawText,
            result.RawLinesJson,
            fields,
            result.ConfidenceScore,
            result.DurationMs,
            result.Profile,
            result.MaxSide,
            result.PreprocessVariant,
            result.AttemptCount,
            result.WorkerVersion,
            result.ModelVersion,
            result.ErrorMessage,
            result.ProcessingStartedAt,
            result.ProcessedAt,
            result.CreatedAt);
    }

    internal static ExpenseOcrSummaryDto ToSummary(
        Guid expenseClaimId,
        IReadOnlyList<ExpenseOcrResult> results,
        bool canApply)
    {
        var latest = LatestPerAttachment(results);
        var dtoResults = latest.Select(ToDto).ToList();
        return new ExpenseOcrSummaryDto(
            expenseClaimId,
            ResolveStatus(dtoResults),
            dtoResults,
            MergeSuggestions(dtoResults),
            canApply);
    }

    internal static IReadOnlyList<ExpenseOcrResult> LatestPerAttachment(IReadOnlyList<ExpenseOcrResult> results) =>
        results
            .OrderByDescending(x => x.CreatedAt)
            .GroupBy(x => x.AttachmentUrl)
            .Select(x => x.First())
            .OrderBy(x => x.DocumentType)
            .ThenBy(x => x.CreatedAt)
            .ToList();

    private static IReadOnlyDictionary<string, ExpenseOcrFieldSuggestionDto> MergeSuggestions(
        IReadOnlyList<ExpenseOcrResultDto> results)
    {
        var merged = new Dictionary<string, ExpenseOcrFieldSuggestionDto>(StringComparer.OrdinalIgnoreCase);
        foreach (var result in results.Where(x => x.Status == ExpenseOcrStatus.Succeeded))
        {
            foreach (var (key, value) in result.ParsedFields)
            {
                if (string.IsNullOrWhiteSpace(value.Value)) continue;
                if (!merged.TryGetValue(key, out var existing) || ShouldReplaceSuggestion(key, existing, value))
                    merged[key] = value;
            }
        }
        return merged;
    }

    private static bool ShouldReplaceSuggestion(
        string key,
        ExpenseOcrFieldSuggestionDto existing,
        ExpenseOcrFieldSuggestionDto candidate)
    {
        var existingRank = SourceRank(key, existing.DocumentType);
        var candidateRank = SourceRank(key, candidate.DocumentType);
        if (candidateRank != existingRank)
            return candidateRank < existingRank;

        return (candidate.Confidence ?? 0m) > (existing.Confidence ?? 0m);
    }

    private static int SourceRank(string key, ExpenseAttachmentDocumentType? documentType)
    {
        if (documentType is null || !FieldSourcePriority.TryGetValue(key, out var priority))
            return int.MaxValue;

        var index = Array.IndexOf(priority, documentType.Value);
        return index >= 0 ? index : int.MaxValue;
    }

    private static ExpenseOcrStatus ResolveStatus(IReadOnlyList<ExpenseOcrResultDto> results)
    {
        if (results.Count == 0) return ExpenseOcrStatus.Pending;
        if (results.Any(x => x.Status == ExpenseOcrStatus.Processing)) return ExpenseOcrStatus.Processing;
        if (results.Any(x => x.Status == ExpenseOcrStatus.Pending)) return ExpenseOcrStatus.Pending;
        if (results.All(x => x.Status == ExpenseOcrStatus.Succeeded)) return ExpenseOcrStatus.Succeeded;
        return ExpenseOcrStatus.Failed;
    }

    private static IReadOnlyDictionary<string, ExpenseOcrFieldSuggestionDto> ParseFields(
        string? json,
        ExpenseAttachmentDocumentType documentType,
        string attachmentUrl)
    {
        if (string.IsNullOrWhiteSpace(json))
            return new Dictionary<string, ExpenseOcrFieldSuggestionDto>();

        try
        {
            var document = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(json, JsonOptions)
                ?? new Dictionary<string, JsonElement>();
            var fields = new Dictionary<string, ExpenseOcrFieldSuggestionDto>(StringComparer.OrdinalIgnoreCase);
            foreach (var (key, element) in document)
            {
                var suggestion = ParseSuggestion(element, documentType, attachmentUrl);
                if (!string.IsNullOrWhiteSpace(suggestion.Value))
                    fields[key] = suggestion;
            }
            return fields;
        }
        catch
        {
            return new Dictionary<string, ExpenseOcrFieldSuggestionDto>();
        }
    }

    private static ExpenseOcrFieldSuggestionDto ParseSuggestion(
        JsonElement element,
        ExpenseAttachmentDocumentType documentType,
        string attachmentUrl)
    {
        if (element.ValueKind == JsonValueKind.Object)
        {
            var value = element.TryGetProperty("value", out var valueElement)
                ? ReadString(valueElement)
                : null;
            var confidence = element.TryGetProperty("confidence", out var confidenceElement)
                ? ReadDecimal(confidenceElement)
                : null;
            var source = element.TryGetProperty("source", out var sourceElement)
                ? ReadString(sourceElement)
                : null;
            return new ExpenseOcrFieldSuggestionDto(value, confidence, source, documentType, attachmentUrl);
        }

        return new ExpenseOcrFieldSuggestionDto(
            ReadString(element),
            null,
            "ocr-parser",
            documentType,
            attachmentUrl);
    }

    private static string? ReadString(JsonElement element) =>
        element.ValueKind switch
        {
            JsonValueKind.String => element.GetString(),
            JsonValueKind.Number => element.GetRawText(),
            JsonValueKind.True => "true",
            JsonValueKind.False => "false",
            _ => null
        };

    private static decimal? ReadDecimal(JsonElement element)
    {
        if (element.ValueKind == JsonValueKind.Number && element.TryGetDecimal(out var value))
            return value;
        if (element.ValueKind == JsonValueKind.String && decimal.TryParse(element.GetString(), out value))
            return value;
        return null;
    }
}
