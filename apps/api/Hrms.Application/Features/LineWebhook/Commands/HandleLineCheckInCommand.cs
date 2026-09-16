using Hrms.Application.Common.Helpers;
using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.LineWebhook.Commands;

public record HandleLineCheckInCommand(
    string LineUserId,
    string ReplyToken,
    double Latitude,
    double Longitude) : IRequest<Unit>;

public class HandleLineCheckInHandler(
    IApplicationDbContext db,
    ILineMessagingService line,
    IGeofenceService geofence,
    IShiftResolver shiftResolver,
    ILineMessageTextFactory messageText)
    : IRequestHandler<HandleLineCheckInCommand, Unit>
{
    public async Task<Unit> Handle(HandleLineCheckInCommand request, CancellationToken ct)
    {
        var employee = await db.Employees
            .FirstOrDefaultAsync(e => e.LineUserId == request.LineUserId && e.IsActive, ct);

        // ยังไม่รู้จักคนนี้ในระบบ — ไม่มีภาษาที่จำไว้ ตอบเป็นภาษาตั้งต้น
        var text = messageText.For(employee?.PreferredLanguage);

        if (employee is null)
        {
            await line.ReplyAsync(request.ReplyToken, text.Of("webhook.accountNotLinked"), ct);
            return Unit.Value;
        }

        var today = ThaiDateTime.Today;
        var now   = ThaiDateTime.Now;

        var existing = await db.AttendanceRecords
            .FirstOrDefaultAsync(r => r.EmployeeId == employee.Id && r.Date == today, ct);

        if (existing?.CheckInTime != null)
        {
            await line.ReplyAsync(request.ReplyToken,
                text.Of("webhook.alreadyCheckedIn", new { time = existing.CheckInTime.Value.ToString("HH:mm") }), ct);
            return Unit.Value;
        }

        var locations = await db.Locations
            .Where(l => l.CompanyId == employee.CompanyId && l.IsActive)
            .ToListAsync(ct);

        var matchedLocation = locations.FirstOrDefault(l =>
            geofence.IsWithinGeofence(
                l.Latitude, l.Longitude,
                Math.Max(l.RadiusMeters, 100),
                request.Latitude, request.Longitude));

        if (matchedLocation is null)
        {
            await line.ReplyAsync(request.ReplyToken, text.Of("webhook.outsideGeofenceCheckIn"), ct);
            return Unit.Value;
        }

        var shift = await shiftResolver.ResolveAsync(employee.Id, today, ct);

        var checkInTime = TimeOnly.FromDateTime(now);
        var isLate      = shift != null && checkInTime > shift.StartTime.AddMinutes(shift.GracePeriodMinutes);
        var lateMinutes = isLate ? (int)(checkInTime - shift!.StartTime).TotalMinutes : 0;

        var record = existing ?? new AttendanceRecord { EmployeeId = employee.Id, Date = today };
        record.LocationId       = matchedLocation.Id;
        record.CheckInTime      = now;
        record.CheckInLatitude  = request.Latitude;
        record.CheckInLongitude = request.Longitude;
        record.IsLate           = isLate;
        record.LateMinutes      = lateMinutes;
        record.Status           = isLate ? AttendanceStatus.Late : AttendanceStatus.Present;

        if (existing is null) db.AttendanceRecords.Add(record);

        await db.SaveChangesAsync(ct);

        var card = LineFlexBuilder.BuildCheckInResultCard(
            text,
            $"{employee.FirstName} {employee.LastName}",
            now, matchedLocation.Name, isLate, lateMinutes);

        await line.ReplyFlexMessageAsync(request.ReplyToken, text.Of("attendance.checkIn.done"), card, ct);
        return Unit.Value;
    }
}
