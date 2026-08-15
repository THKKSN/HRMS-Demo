namespace Hrms.Application.Common.Options;

public class ExpenseOcrOptions
{
    public const string SectionName = "ExpenseOcr";
    public const string DefaultQueueName = "ocr";

    public bool Enabled { get; set; }
    public string Provider { get; set; } = "PaddleOCR";
    public string? WorkerBaseUrl { get; set; }
    public string[] WorkerBaseUrls { get; set; } = [];
    public int TimeoutSeconds { get; set; } = 120;
    public string Profile { get; set; } = "fast";
    public int MaxSide { get; set; } = 800;
    public string PreprocessVariant { get; set; } = "resize-800";
    public string QueueName { get; set; } = DefaultQueueName;
    public int MaxConcurrentWorkerRequests { get; set; } = 1;
    public int WorkerBusyRetryDelaySeconds { get; set; } = 30;
    public int StaleProcessingMinutes { get; set; } = 10;
    public bool EnableResultCache { get; set; } = true;
    public int MaxRetryAttempts { get; set; } = 3;
}
