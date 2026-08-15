using System.Net.Http.Json;
using System.Net;
using System.Text;
using System.Text.Json;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Options;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Hrms.Infrastructure.Services;

public class HttpExpenseOcrEngine(
    HttpClient httpClient,
    IOptions<ExpenseOcrOptions> options,
    ILogger<HttpExpenseOcrEngine> logger) : IExpenseOcrEngine
{
    private static int NextWorkerIndex;

    public async Task<ExpenseOcrEngineResult> RecognizeAsync(
        ExpenseOcrEngineRequest request,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.AttachmentUrl))
            throw new InvalidOperationException($"Expense OCR result {request.ExpenseOcrResultId} has an empty attachment URL.");

        var config = options.Value;
        if (!config.Enabled)
            throw new InvalidOperationException("Expense OCR worker is disabled. Set ExpenseOcr:Enabled=true.");
        var workerBaseUrls = ResolveWorkerBaseUrls(config);
        if (workerBaseUrls.Count == 0)
            throw new InvalidOperationException("Expense OCR worker URL is not configured.");

        httpClient.Timeout = TimeSpan.FromSeconds(Math.Max(config.TimeoutSeconds, 30));

        logger.LogInformation(
            "Sending expense OCR result {ExpenseOcrResultId} ({DocumentType}) to one of {WorkerCount} OCR worker(s) with attachment {AttachmentUrl}",
            request.ExpenseOcrResultId,
            request.DocumentType,
            workerBaseUrls.Count,
            request.AttachmentUrl);

        var payload = new
        {
            expenseClaimId = request.ExpenseClaimId,
            expenseOcrResultId = request.ExpenseOcrResultId,
            attachmentUrl = request.AttachmentUrl,
            documentType = request.DocumentType.ToString(),
            provider = config.Provider,
            profile = config.Profile,
            maxSide = config.MaxSide,
            preprocessVariant = config.PreprocessVariant
        };
        var payloadJson = JsonSerializer.Serialize(payload);
        var startIndex = (int)((uint)Interlocked.Increment(ref NextWorkerIndex) % (uint)workerBaseUrls.Count);
        ExpenseOcrTransientException? lastTransientException = null;

        for (var offset = 0; offset < workerBaseUrls.Count; offset++)
        {
            var workerBaseUrl = workerBaseUrls[(startIndex + offset) % workerBaseUrls.Count];
            var workerUri = new Uri($"{workerBaseUrl}/v1/ocr/expense");
            using var content = new StringContent(payloadJson, Encoding.UTF8, "application/json");

            HttpResponseMessage response;
            try
            {
                response = await httpClient.PostAsync(workerUri, content, ct);
            }
            catch (TaskCanceledException ex) when (!ct.IsCancellationRequested)
            {
                lastTransientException = new ExpenseOcrTransientException(
                    "OCR_TIMEOUT",
                    $"Expense OCR worker {workerBaseUrl} request timed out.",
                    ex);
                logger.LogWarning(ex, "Expense OCR worker {WorkerBaseUrl} timed out", workerBaseUrl);
                continue;
            }
            catch (HttpRequestException ex)
            {
                lastTransientException = new ExpenseOcrTransientException(
                    "OCR_WORKER_UNAVAILABLE",
                    $"Expense OCR worker {workerBaseUrl} is unavailable.",
                    ex);
                logger.LogWarning(ex, "Expense OCR worker {WorkerBaseUrl} is unavailable", workerBaseUrl);
                continue;
            }

            using (response)
            {
                if (!response.IsSuccessStatusCode)
                {
                    var errorBody = await response.Content.ReadAsStringAsync(ct);
                    if (IsTransientStatusCode(response.StatusCode))
                    {
                        lastTransientException = new ExpenseOcrTransientException(
                            ErrorCodeFromStatusCode(response.StatusCode),
                            $"Expense OCR worker {workerBaseUrl} transient failure ({(int)response.StatusCode} {response.ReasonPhrase}): {Truncate(errorBody, 500)}");
                        logger.LogWarning(
                            "Expense OCR worker {WorkerBaseUrl} returned transient status {StatusCode}: {ReasonPhrase}",
                            workerBaseUrl,
                            (int)response.StatusCode,
                            response.ReasonPhrase);
                        continue;
                    }

                    throw new HttpRequestException(
                        $"Expense OCR worker {workerBaseUrl} failed ({(int)response.StatusCode} {response.ReasonPhrase}): {Truncate(errorBody, 500)}",
                        null,
                        response.StatusCode);
                }

                var result = await response.Content.ReadFromJsonAsync<WorkerExpenseOcrResponse>(cancellationToken: ct)
                    ?? throw new InvalidOperationException("Expense OCR worker returned an empty response.");

                return new ExpenseOcrEngineResult(
                    string.IsNullOrWhiteSpace(result.Provider) ? config.Provider : result.Provider,
                    result.RawText ?? string.Empty,
                    result.ParsedJson ?? "{}",
                    result.RawLinesJson,
                    result.ConfidenceScore,
                    result.DurationMs,
                    config.Profile,
                    config.MaxSide,
                    config.PreprocessVariant,
                    result.WorkerVersion,
                    result.ModelVersion);
            }
        }

        throw lastTransientException
            ?? new ExpenseOcrTransientException("OCR_WORKER_UNAVAILABLE", "No Expense OCR workers are available.");
    }

    private sealed record WorkerExpenseOcrResponse(
        string? Provider,
        string? RawText,
        string? ParsedJson,
        string? RawLinesJson,
        decimal? ConfidenceScore,
        decimal? DurationMs,
        string? WorkerVersion,
        string? ModelVersion);

    private static string Truncate(string value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
            return "(empty response)";
        return value.Length <= maxLength ? value : value[..maxLength];
    }

    private static bool IsTransientStatusCode(HttpStatusCode statusCode) =>
        statusCode is HttpStatusCode.TooManyRequests
            or HttpStatusCode.RequestTimeout
            or HttpStatusCode.BadGateway
            or HttpStatusCode.ServiceUnavailable
            or HttpStatusCode.GatewayTimeout;

    private static string ErrorCodeFromStatusCode(HttpStatusCode statusCode) =>
        statusCode == HttpStatusCode.TooManyRequests
            ? "WORKER_BUSY"
            : "OCR_WORKER_UNAVAILABLE";

    private static IReadOnlyList<string> ResolveWorkerBaseUrls(ExpenseOcrOptions config)
    {
        var values = config.WorkerBaseUrls
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Select(value => value.Trim().TrimEnd('/'));

        if (!string.IsNullOrWhiteSpace(config.WorkerBaseUrl))
            values = values.Append(config.WorkerBaseUrl.Trim().TrimEnd('/'));

        return values
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }
}
