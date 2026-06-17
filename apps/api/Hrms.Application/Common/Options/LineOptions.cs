namespace Hrms.Application.Common.Options;

public class LineOptions
{
    public const string SectionName = "Line";

    public string ChannelId { get; set; } = string.Empty;
    public string ChannelSecret { get; set; } = string.Empty;
    public string LiffId { get; set; } = string.Empty;
    public string MessagingChannelAccessToken { get; set; } = string.Empty;
}
