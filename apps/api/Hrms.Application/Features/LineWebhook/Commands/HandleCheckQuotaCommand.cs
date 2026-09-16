using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Localization;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.LineWebhook.Commands;

public record HandleCheckQuotaCommand(string LineUserId, string? ReplyToken = null) : IRequest<Unit>;

public class HandleCheckQuotaHandler(
    IApplicationDbContext db,
    ILineMessagingService line,
    ILineMessageTextFactory messageText)
    : IRequestHandler<HandleCheckQuotaCommand, Unit>
{
    public async Task<Unit> Handle(HandleCheckQuotaCommand request, CancellationToken ct)
    {
        var employee = await db.Employees
            .FirstOrDefaultAsync(e => e.LineUserId == request.LineUserId && e.IsActive, ct);

        var text = messageText.For(employee?.PreferredLanguage);

        if (employee is null)
        {
            await SendTextAsync(request, text.Of("webhook.accountNotLinkedLogin"), ct);
            return Unit.Value;
        }

        var year = DateTime.UtcNow.AddHours(7).Year;

        var balances = await db.LeaveBalances
            .Include(b => b.LeaveType)
            .Where(b => b.EmployeeId == employee.Id && b.Year == year
                     && b.TotalDays > 0
                     && (b.TotalDays - b.UsedDays - b.PendingDays) > 0)
            .OrderBy(b => b.LeaveType.NameTh)
            .ToListAsync(ct);

        if (balances.Count == 0)
        {
            await SendTextAsync(request, text.Of("webhook.quota.noData", new { year }), ct);
            return Unit.Value;
        }

        var rows = balances.Select(b => (object)new
        {
            type = "box",
            layout = "horizontal",
            contents = new object[]
            {
                new
                {
                    type = "text",
                    text = LocalizedName.For(b.LeaveType.NameTh, b.LeaveType.NameEn, b.LeaveType.NameId, text.Locale),
                    size = "sm", color = "#555555", flex = 4
                },
                new
                {
                    type = "text",
                    text = text.Of("webhook.quota.remainingOfTotal", new
                    {
                        remaining = b.TotalDays - b.UsedDays - b.PendingDays,
                        total = b.TotalDays,
                    }),
                    size = "sm",
                    color = "#111111",
                    align = "end",
                    flex = 3
                }
            }
        }).ToArray<object>();

        var card = new
        {
            type = "bubble",
            header = new
            {
                type = "box",
                layout = "vertical",
                paddingAll = "16px",
                backgroundColor = "#1DB446",
                contents = new object[]
                {
                    new { type = "text", text = text.Of("webhook.quota.title"), color = "#ffffff", size = "md", weight = "bold" },
                    new
                    {
                        type = "text",
                        text = text.Of("webhook.quota.subtitle", new
                        {
                            name = $"{employee.FirstName} {employee.LastName}",
                            year,
                        }),
                        color = "#ffffffcc", size = "sm"
                    }
                }
            },
            body = new
            {
                type = "box",
                layout = "vertical",
                spacing = "sm",
                contents = rows
            }
        };

        await SendFlexAsync(
            request,
            text.Of("webhook.quota.altText", new { name = employee.FirstName }),
            card,
            ct);

        return Unit.Value;
    }

    private Task SendTextAsync(HandleCheckQuotaCommand request, string message, CancellationToken ct) =>
        !string.IsNullOrWhiteSpace(request.ReplyToken)
            ? line.ReplyAsync(request.ReplyToken, message, ct)
            : line.PushMessageAsync(request.LineUserId, message, ct);

    private Task SendFlexAsync(
        HandleCheckQuotaCommand request,
        string altText,
        object flexContainer,
        CancellationToken ct) =>
        !string.IsNullOrWhiteSpace(request.ReplyToken)
            ? line.ReplyFlexMessageAsync(request.ReplyToken, altText, flexContainer, ct)
            : line.PushFlexMessageAsync(request.LineUserId, altText, flexContainer, ct);
}
