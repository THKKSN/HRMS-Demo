using System.Net;
using System.Net.Http.Json;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.LineWebhook;
using Hrms.Application.Common.Localization;
using Hrms.Application.Common.Options;
using Microsoft.Extensions.Options;

namespace Hrms.Infrastructure.Services;

public class LineMessagingService(
    HttpClient httpClient,
    IOptions<LineOptions> options) : ILineMessagingService
{
    private readonly LineOptions _opts = options.Value;

    public string BuildLiffUri(string path)
    {
        var normalizedPath = path.StartsWith('/') ? path : $"/{path}";
        return $"https://liff.line.me/{Uri.EscapeDataString(_opts.LiffId)}{normalizedPath}";
    }

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

    public async Task ReplyHrMenuAsync(string replyToken, MessageText text, CancellationToken ct = default)
    {
        var message = new
        {
            type = "text",
            text = text.Of("webhook.menu.welcome"),
            quickReply = new
            {
                items = new object[]
                {
                    new
                    {
                        type = "action",
                        action = new
                        {
                            type = "message",
                            label = text.Of("webhook.menu.attendance"),
                            // ตัว text คือคำที่ถูกส่งกลับเข้า webhook เป็น "คำสั่ง" — ต้องตรงกับ
                            // WebhookKeywords และกับปุ่มบน rich menu ที่ตั้งไว้ใน LINE console จึงห้ามแปล
                            text = WebhookKeywords.Attendance
                        }
                    },
                    new
                    {
                        type = "action",
                        action = new
                        {
                            type = "uri",
                            label = text.Of("webhook.menu.leave"),
                            uri = BuildLiffUri("/leaves/new")
                        }
                    },
                    // new
                    // {
                    //     type = "action",
                    //     action = new
                    //     {
                    //         type = "uri",
                    //         label = "แจ้งปัญหา",
                    //         uri = BuildLiffUri("/tickets/new")
                    //     }
                    // },
                    new
                    {
                        type = "action",
                        action = new
                        {
                            type = "message",
                            label = text.Of("webhook.menu.leaveQuota"),
                            text = WebhookKeywords.CheckQuota
                        }
                    }
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

    public async Task ReplyFlexWithLocationRequestAsync(string replyToken, string altText, object flexContainer, MessageText text, CancellationToken ct = default)
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
                    new { type = "action", action = new { type = "location", label = text.Of("webhook.shareLocation") } }
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
        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(ct);
            // 429 = โควตาข้อความรายเดือนเต็ม (หรือ rate limit) — แยกเป็น exception เฉพาะ
            // ให้ flow ผูกบัญชี fallback มา OTP ไม่ได้ ตัดสินใจได้ว่านี่คือเคส push เต็มจริง
            if (response.StatusCode == HttpStatusCode.TooManyRequests)
                throw new LinePushQuotaExceededException(errorBody);
            throw new HttpRequestException(
                $"LINE push failed with {(int)response.StatusCode} {response.StatusCode}: {errorBody}");
        }
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
