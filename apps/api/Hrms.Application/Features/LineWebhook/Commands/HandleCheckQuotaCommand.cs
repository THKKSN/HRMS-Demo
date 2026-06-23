using Hrms.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.LineWebhook.Commands;

public record HandleCheckQuotaCommand(string LineUserId) : IRequest<Unit>;

public class HandleCheckQuotaHandler(IApplicationDbContext db, ILineMessagingService line)
    : IRequestHandler<HandleCheckQuotaCommand, Unit>
{
    public async Task<Unit> Handle(HandleCheckQuotaCommand request, CancellationToken ct)
    {
        var employee = await db.Employees
            .FirstOrDefaultAsync(e => e.LineUserId == request.LineUserId && e.IsActive, ct);

        if (employee is null)
        {
            await line.PushMessageAsync(request.LineUserId,
                "ไม่พบข้อมูลผู้ใช้ กรุณากด 'เข้าสู่ระบบ' เพื่อผูกบัญชีก่อนใช้งาน", ct);
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
            await line.PushMessageAsync(request.LineUserId,
                $"ยังไม่มีข้อมูลโควต้าวันลาสำหรับปี {year}", ct);
            return Unit.Value;
        }

        var rows = balances.Select(b => (object)new
        {
            type = "box",
            layout = "horizontal",
            contents = new object[]
            {
                new { type = "text", text = b.LeaveType.NameTh, size = "sm", color = "#555555", flex = 4 },
                new
                {
                    type = "text",
                    text = $"{b.TotalDays - b.UsedDays - b.PendingDays}/{b.TotalDays} วัน",
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
                    new { type = "text", text = "สิทธิ์วันลาของคุณ", color = "#ffffff", size = "md", weight = "bold" },
                    new { type = "text", text = $"{employee.FirstName} {employee.LastName} · ปี {year}", color = "#ffffffcc", size = "sm" }
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

        await line.PushFlexMessageAsync(
            request.LineUserId,
            $"สิทธิ์วันลาของ {employee.FirstName}",
            card,
            ct);

        return Unit.Value;
    }
}
