namespace Hrms.Application.Common.Options;

public sealed class ExternalRepairSyncOptions
{
    public const string SectionName = "ExternalRepairSync";

    public bool Enabled { get; init; }
    public string Endpoint { get; init; } = string.Empty;
    public string ApiKey { get; init; } = string.Empty;
    public int TimeoutSeconds { get; init; } = 15;
}
