using Hrms.Application.Features.LineWebhook.Commands;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("v1/line")]
public class LineWebhookController(IMediator mediator) : ControllerBase
{
    [HttpPost("webhook")]
    public async Task<IActionResult> Webhook(CancellationToken ct)
    {
        // ต้องอ่าน raw body ก่อนที่ model binder จะแตะ
        using var reader = new StreamReader(Request.Body);
        var body = await reader.ReadToEndAsync(ct);

        var signature = Request.Headers["X-Line-Signature"].FirstOrDefault() ?? string.Empty;

        await mediator.Send(new HandleLineWebhookCommand(body, signature), ct);

        // LINE กำหนดว่าต้อง return 200 เสมอ ไม่ว่าจะเกิดอะไรขึ้น
        return Ok();
    }
}
