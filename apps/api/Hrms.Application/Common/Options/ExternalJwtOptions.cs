namespace Hrms.Application.Common.Options;

public sealed class ExternalJwtOptions
{
    public const string SectionName = "ExternalJwt";

    public string Secret { get; set; } = string.Empty;
    public string Issuer { get; set; } = string.Empty;
    public string Audience { get; set; } = string.Empty;
    public int AccessTokenExpiryMinutes { get; set; } = 15;
}
