namespace Hrms.Application.Common.Options;

public sealed class PiswinOptions
{
    public const string SectionName = "Piswin";

    public string Endpoint { get; init; } = string.Empty;
    public string ApiKey { get; init; } = string.Empty;
    public string DepartmentCode { get; init; } = string.Empty;
    public int Year { get; init; }
    public int TimeoutSeconds { get; init; } = 15;
}
