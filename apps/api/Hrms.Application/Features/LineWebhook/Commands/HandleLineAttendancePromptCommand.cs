using Hrms.Application.Common.Helpers;
using Hrms.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;

namespace Hrms.Application.Features.LineWebhook.Commands;

public record HandleLineAttendancePromptCommand(string LineUserId, string ReplyToken) : IRequest<Unit>;

public class HandleLineAttendancePromptHandler(
    IApplicationDbContext db,
    ILineMessagingService line,
    IDistributedCache cache)
    : IRequestHandler<HandleLineAttendancePromptCommand, Unit>
{
    public async Task<Unit> Handle(HandleLineAttendancePromptCommand request, CancellationToken ct)
    {
        var employee = await db.Employees
            .FirstOrDefaultAsync(e => e.LineUserId == request.LineUserId && e.IsActive, ct);

        if (employee is null)
        {
            await line.ReplyAsync(request.ReplyToken,
                "ยังไม่ได้ผูกบัญชี LINE กรุณากด 'เข้าสู่ระบบ' ก่อนใช้งาน", ct);
            return Unit.Value;
        }

        var today  = ThaiDateTime.Today;
        var record = await db.AttendanceRecords
            .FirstOrDefaultAsync(r => r.EmployeeId == employee.Id && r.Date == today, ct);

        var cacheKey = $"line:pending:{request.LineUserId}";
        var opts     = new DistributedCacheEntryOptions
            { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5) };

        var employeeName = $"{employee.FirstName} {employee.LastName}";

        if (record?.CheckInTime == null)
        {
            await cache.SetStringAsync(cacheKey, "checkin", opts, ct);
            var card = LineFlexBuilder.BuildAttendancePromptCard(employeeName, isCheckIn: true);
            await line.ReplyFlexWithLocationRequestAsync(request.ReplyToken, "เช็คอินเริ่มงาน", card, ct);
        }
        else if (record.CheckOutTime == null)
        {
            var checkInStr = record.CheckInTime.Value.ToString("HH:mm");
            await cache.SetStringAsync(cacheKey, "checkout", opts, ct);
            var card = LineFlexBuilder.BuildAttendancePromptCard(employeeName, isCheckIn: false, checkInTime: checkInStr);
            await line.ReplyFlexWithLocationRequestAsync(request.ReplyToken, "เช็คเอาต์ออกงาน", card, ct);
        }
        else
        {
            var card = LineFlexBuilder.BuildAttendanceTodayCard(
                $"{employee.FirstName} {employee.LastName}",
                today.ToString("dd/MM/yyyy"),
                record.CheckInTime?.ToString("HH:mm"),
                record.CheckOutTime?.ToString("HH:mm"),
                record.Status.ToString());
            await line.ReplyFlexMessageAsync(request.ReplyToken, "สรุปการเข้างานวันนี้", card, ct);
        }

        return Unit.Value;
    }
}
