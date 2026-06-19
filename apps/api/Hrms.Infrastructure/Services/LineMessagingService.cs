using System.Net.Http.Json;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Options;
using Microsoft.Extensions.Options;

namespace Hrms.Infrastructure.Services;

public class LineMessagingService(
    HttpClient httpClient,
    IOptions<LineOptions> options) : ILineMessagingService
{
    private readonly LineOptions _opts = options.Value;

    public async Task PushMessageAsync(string lineUserId, string message, CancellationToken ct = default)
    {
        await PushAsync(lineUserId,
            new object[] { new { type = "text", text = message } },
            ct);
    }

    public async Task PushConfirmTemplateAsync(
        string lineUserId,
        string altText,
        string text,
        string confirmLabel,
        string confirmData,
        string rejectLabel,
        string rejectData,
        CancellationToken ct = default)
    {
        var template = new
        {
            type = "template",
            altText,
            template = new
            {
                type    = "confirm",
                text,
                actions = new object[]
                {
                    new { type = "postback", label = confirmLabel, data = confirmData },
                    new { type = "postback", label = rejectLabel,  data = rejectData  }
                }
            }
        };

        await PushAsync(lineUserId, new object[] { template }, ct);
    }

    private async Task PushAsync(string lineUserId, object[] messages, CancellationToken ct)
    {
        httpClient.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _opts.MessagingChannelAccessToken);

        var body = new { to = lineUserId, messages };

        var response = await httpClient.PostAsJsonAsync(
            "https://api.line.me/v2/bot/message/push", body, ct);

        response.EnsureSuccessStatusCode();
    }
}
