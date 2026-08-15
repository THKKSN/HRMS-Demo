using Hangfire;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Options;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using Hrms.Infrastructure.Persistence;
using Hrms.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Hrms.Infrastructure.Jobs;

[Queue(ExpenseOcrOptions.DefaultQueueName)]
[AutomaticRetry(Attempts = 0)]
public class ExpenseOcrJob(
    HrmsDbContext db,
    IExpenseOcrEngine engine,
    IExpenseOcrQueue ocrQueue,
    IOptions<ExpenseOcrOptions> options,
    ILogger<ExpenseOcrJob> logger)
{
    public async Task ProcessAsync(Guid expenseOcrResultId, CancellationToken ct = default)
    {
        var config = options.Value;
        var result = await db.ExpenseOcrResults
            .FirstOrDefaultAsync(x => x.Id == expenseOcrResultId, ct);
        if (result is null)
        {
            logger.LogWarning("Expense OCR result {ExpenseOcrResultId} was not found", expenseOcrResultId);
            return;
        }
        if (result.Status == ExpenseOcrStatus.Succeeded)
            return;

        var now = DateTime.UtcNow.AddHours(7);
        if (string.IsNullOrWhiteSpace(result.AttachmentUrl))
        {
            result.Status = ExpenseOcrStatus.Failed;
            result.ErrorMessage = "Attachment URL is empty.";
            result.ProcessedAt = now;
            result.ProcessingStartedAt = null;
            result.AttemptCount++;
            logger.LogWarning(
                "Expense OCR result {ExpenseOcrResultId} has an empty attachment URL and will not be sent to the worker",
                result.Id);
            await db.SaveChangesAsync(ct);
            return;
        }

        if (await TryReuseCachedResultAsync(result, config, ct))
            return;

        result.Status = ExpenseOcrStatus.Processing;
        result.ProcessingStartedAt = now;
        result.ProcessedAt = null;
        result.ErrorMessage = null;
        result.AttemptCount++;
        await db.SaveChangesAsync(ct);

        try
        {
            var ocr = await engine.RecognizeAsync(
                new ExpenseOcrEngineRequest(
                    result.ExpenseClaimId,
                    result.Id,
                    result.AttachmentUrl,
                    result.DocumentType),
                ct);

            result.Provider = ocr.Provider;
            result.RawText = ocr.RawText;
            result.RawLinesJson = ocr.RawLinesJson;
            result.ParsedJson = string.IsNullOrWhiteSpace(ocr.ParsedJson) ? "{}" : ocr.ParsedJson;
            result.ConfidenceScore = ocr.ConfidenceScore;
            result.DurationMs = ocr.DurationMs;
            result.Profile = ocr.Profile;
            result.MaxSide = ocr.MaxSide;
            result.PreprocessVariant = ocr.PreprocessVariant;
            result.WorkerVersion = ocr.WorkerVersion;
            result.ModelVersion = ocr.ModelVersion;
            result.Status = ExpenseOcrStatus.Succeeded;
            result.ProcessedAt = DateTime.UtcNow.AddHours(7);
            result.ProcessingStartedAt = null;
        }
        catch (Exception ex) when (IsTransientOcrFailure(ex, ct))
        {
            var delay = TimeSpan.FromSeconds(Math.Max(config.WorkerBusyRetryDelaySeconds, 1));
            result.Status = result.AttemptCount < Math.Max(config.MaxRetryAttempts, 1)
                ? ExpenseOcrStatus.Pending
                : ExpenseOcrStatus.Failed;
            result.ErrorMessage = Truncate($"{GetTransientCode(ex)}: {ex.GetBaseException().Message}", 500);
            result.ProcessedAt = result.Status == ExpenseOcrStatus.Failed ? DateTime.UtcNow.AddHours(7) : null;
            result.ProcessingStartedAt = null;

            if (result.Status == ExpenseOcrStatus.Pending)
            {
                logger.LogWarning(
                    ex,
                    "Expense OCR result {ExpenseOcrResultId} had a transient failure and will retry in {DelaySeconds} seconds",
                    result.Id,
                    delay.TotalSeconds);
                await db.SaveChangesAsync(ct);
                ocrQueue.Schedule(result.Id, delay);
                return;
            }

            logger.LogWarning(
                ex,
                "Expense OCR result {ExpenseOcrResultId} exhausted transient retries",
                result.Id);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            result.Status = ExpenseOcrStatus.Failed;
            result.ErrorMessage = Truncate(ex.GetBaseException().Message, 500);
            result.ProcessedAt = DateTime.UtcNow.AddHours(7);
            result.ProcessingStartedAt = null;
            logger.LogWarning(ex, "Expense OCR result {ExpenseOcrResultId} failed", result.Id);
        }

        await db.SaveChangesAsync(ct);
    }

    public async Task RecoverStaleProcessingAsync(CancellationToken ct = default)
    {
        var config = options.Value;
        var staleBefore = DateTime.UtcNow.AddHours(7).AddMinutes(-Math.Max(config.StaleProcessingMinutes, 1));
        var staleResults = await db.ExpenseOcrResults
            .Where(x => x.Status == ExpenseOcrStatus.Processing &&
                x.ProcessingStartedAt != null &&
                x.ProcessingStartedAt < staleBefore)
            .OrderBy(x => x.ProcessingStartedAt)
            .Take(50)
            .ToListAsync(ct);

        var retryIds = new List<Guid>();
        foreach (var result in staleResults)
        {
            result.ProcessingStartedAt = null;
            if (result.AttemptCount < Math.Max(config.MaxRetryAttempts, 1))
            {
                result.Status = ExpenseOcrStatus.Pending;
                result.ErrorMessage = "STALE_PROCESSING: reset and requeued.";
                retryIds.Add(result.Id);
            }
            else
            {
                result.Status = ExpenseOcrStatus.Failed;
                result.ErrorMessage = "STALE_PROCESSING: max retry attempts reached.";
                result.ProcessedAt = DateTime.UtcNow.AddHours(7);
            }
        }

        if (staleResults.Count > 0)
        {
            logger.LogWarning("Recovered {Count} stale expense OCR result(s)", staleResults.Count);
            await db.SaveChangesAsync(ct);
            foreach (var id in retryIds)
                ocrQueue.Enqueue(id);
        }
    }

    private async Task<bool> TryReuseCachedResultAsync(
        ExpenseOcrResult result,
        ExpenseOcrOptions config,
        CancellationToken ct)
    {
        if (!config.EnableResultCache)
            return false;

        var cached = await db.ExpenseOcrResults
            .AsNoTracking()
            .Where(x => x.Id != result.Id &&
                x.Status == ExpenseOcrStatus.Succeeded &&
                x.AttachmentUrl == result.AttachmentUrl &&
                x.DocumentType == result.DocumentType &&
                x.Provider == config.Provider &&
                x.Profile == config.Profile &&
                x.MaxSide == config.MaxSide &&
                x.PreprocessVariant == config.PreprocessVariant)
            .OrderByDescending(x => x.ProcessedAt ?? x.UpdatedAt)
            .FirstOrDefaultAsync(ct);

        if (cached is null)
            return false;

        result.Provider = cached.Provider;
        result.RawText = cached.RawText;
        result.RawLinesJson = cached.RawLinesJson;
        result.ParsedJson = string.IsNullOrWhiteSpace(cached.ParsedJson) ? "{}" : cached.ParsedJson;
        result.ConfidenceScore = cached.ConfidenceScore;
        result.DurationMs = cached.DurationMs;
        result.Profile = cached.Profile;
        result.MaxSide = cached.MaxSide;
        result.PreprocessVariant = cached.PreprocessVariant;
        result.WorkerVersion = cached.WorkerVersion;
        result.ModelVersion = cached.ModelVersion;
        result.ErrorMessage = null;
        result.Status = ExpenseOcrStatus.Succeeded;
        result.ProcessedAt = DateTime.UtcNow.AddHours(7);
        result.ProcessingStartedAt = null;

        logger.LogInformation(
            "Reused cached OCR result {CachedExpenseOcrResultId} for expense OCR result {ExpenseOcrResultId}",
            cached.Id,
            result.Id);

        await db.SaveChangesAsync(ct);
        return true;
    }

    private static bool IsTransientOcrFailure(Exception ex, CancellationToken ct) =>
        ex is ExpenseOcrTransientException ||
        (ex is TaskCanceledException && !ct.IsCancellationRequested);

    private static string GetTransientCode(Exception ex) =>
        ex is ExpenseOcrTransientException transient ? transient.Code : "OCR_TIMEOUT";

    private static string Truncate(string value, int maxLength) =>
        value.Length <= maxLength ? value : value[..maxLength];
}
