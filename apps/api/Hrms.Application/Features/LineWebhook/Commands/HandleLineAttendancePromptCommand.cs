using Hrms.Application.Common.Helpers;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Localization;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;

namespace Hrms.Application.Features.LineWebhook.Commands;

public record HandleLineAttendancePromptCommand(string LineUserId, string ReplyToken) : IRequest<Unit>;

public class HandleLineAttendancePromptHandler(
    IApplicationDbContext db,
    ILineMessagingService line,
    IDistributedCache cache,
    ILineMessageTextFactory messageText)
    : IRequestHandler<HandleLineAttendancePromptCommand, Unit>
{
    public async Task<Unit> Handle(HandleLineAttendancePromptCommand request, CancellationToken ct)
    {
        var employee = await db.Employees
            .FirstOrDefaultAsync(e => e.LineUserId == request.LineUserId && e.IsActive, ct);

        var text = messageText.For(employee?.PreferredLanguage);

        if (employee is null)
        {
            await line.ReplyAsync(request.ReplyToken, text.Of("webhook.accountNotLinkedLogin"), ct);
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
            var card = LineFlexBuilder.BuildAttendancePromptCard(text, employeeName, isCheckIn: true);
            await line.ReplyFlexWithLocationRequestAsync(
                request.ReplyToken, text.Of("attendance.checkIn.title"), card, text, ct);
        }
        else if (record.CheckOutTime == null)
        {
            var checkInStr = record.CheckInTime.Value.ToString("HH:mm");
            await cache.SetStringAsync(cacheKey, "checkout", opts, ct);
            var card = LineFlexBuilder.BuildAttendancePromptCard(text, employeeName, isCheckIn: false, checkInTime: checkInStr);
            await line.ReplyFlexWithLocationRequestAsync(
                request.ReplyToken, text.Of("attendance.checkOut.title"), card, text, ct);
        }
        else
        {
            var card = LineFlexBuilder.BuildAttendanceTodayCard(
                text,
                $"{employee.FirstName} {employee.LastName}",
                today.ToString("dd/MM/yyyy"),
                record.CheckInTime?.ToString("HH:mm"),
                record.CheckOutTime?.ToString("HH:mm"),
                record.Status.ToString());
            await line.ReplyFlexMessageAsync(request.ReplyToken, text.Of("attendance.today.title"), card, ct);
        }

        return Unit.Value;
    }
}
