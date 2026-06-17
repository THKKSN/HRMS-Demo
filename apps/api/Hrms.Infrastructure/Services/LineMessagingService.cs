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
        httpClient.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _opts.MessagingChannelAccessToken);

        var body = new
        {
            to = lineUserId,
            messages = new[] { new { type = "text", text = message } }
        };

        var response = await httpClient.PostAsJsonAsync(
            "https://api.line.me/v2/bot/message/push", body, ct);

        response.EnsureSuccessStatusCode();
    }
}
