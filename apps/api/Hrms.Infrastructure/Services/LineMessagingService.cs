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

    public async Task PushFlexMessageAsync(string lineUserId, string altText, object flexContainer, CancellationToken ct = default)
    {
        var message = new { type = "flex", altText, contents = flexContainer };
        await PushAsync(lineUserId, new object[] { message }, ct);
    }

    public async Task ReplyAsync(string replyToken, string message, CancellationToken ct = default)
    {
        await ReplyAsync(replyToken, new object[] { new { type = "text", text = message } }, ct);
    }

    public async Task ReplyWithLocationRequestAsync(string replyToken, string promptText, CancellationToken ct = default)
    {
        var message = new
        {
            type = "text",
            text = promptText,
            quickReply = new
            {
                items = new[]
                {
                    new { type = "action", action = new { type = "location", label = "📍 แชร์ตำแหน่ง" } }
                }
            }
        };
        await ReplyAsync(replyToken, new object[] { message }, ct);
    }

    public async Task ReplyFlexMessageAsync(string replyToken, string altText, object flexContainer, CancellationToken ct = default)
    {
        var message = new { type = "flex", altText, contents = flexContainer };
        await ReplyAsync(replyToken, new object[] { message }, ct);
    }

    public async Task ReplyFlexWithLocationRequestAsync(string replyToken, string altText, object flexContainer, CancellationToken ct = default)
    {
        var message = new
        {
            type = "flex",
            altText,
            contents = flexContainer,
            quickReply = new
            {
                items = new[]
                {
                    new { type = "action", action = new { type = "location", label = "📍 แชร์ตำแหน่ง" } }
                }
            }
        };
        await ReplyAsync(replyToken, new object[] { message }, ct);
    }

    private async Task PushAsync(string lineUserId, object[] messages, CancellationToken ct)
    {
        SetAuthHeader();
        var body = new { to = lineUserId, messages };
        var response = await httpClient.PostAsJsonAsync(
            "https://api.line.me/v2/bot/message/push", body, ct);
        response.EnsureSuccessStatusCode();
    }

    private async Task ReplyAsync(string replyToken, object[] messages, CancellationToken ct)
    {
        SetAuthHeader();
        var body = new { replyToken, messages };
        var response = await httpClient.PostAsJsonAsync(
            "https://api.line.me/v2/bot/message/reply", body, ct);
        response.EnsureSuccessStatusCode();
    }

    private void SetAuthHeader() =>
        httpClient.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _opts.MessagingChannelAccessToken);
}
