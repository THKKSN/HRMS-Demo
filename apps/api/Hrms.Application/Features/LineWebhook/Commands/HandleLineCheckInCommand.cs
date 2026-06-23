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
    IGeofenceService geofence)
    : IRequestHandler<HandleLineCheckInCommand, Unit>
{
    public async Task<Unit> Handle(HandleLineCheckInCommand request, CancellationToken ct)
    {
        var employee = await db.Employees
            .FirstOrDefaultAsync(e => e.LineUserId == request.LineUserId && e.IsActive, ct);

        if (employee is null)
        {
            await line.ReplyAsync(request.ReplyToken,
                "ไม่พบข้อมูลผู้ใช้ กรุณาผูกบัญชีก่อนใช้งาน", ct);
            return Unit.Value;
        }

        var today = ThaiDateTime.Today;
        var now   = ThaiDateTime.Now;

        var existing = await db.AttendanceRecords
            .FirstOrDefaultAsync(r => r.EmployeeId == employee.Id && r.Date == today, ct);

        if (existing?.CheckInTime != null)
        {
            await line.ReplyAsync(request.ReplyToken,
                $"คุณเช็คอินวันนี้ไปแล้ว เวลา {existing.CheckInTime.Value.ToString("HH:mm")} น.", ct);
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
            await line.ReplyAsync(request.ReplyToken,
                "ตำแหน่งปัจจุบันอยู่นอกพื้นที่ที่กำหนด กรุณาเช็คอินในบริเวณสำนักงาน 📍", ct);
            return Unit.Value;
        }

        var shift = await db.Shifts
            .Where(s => s.CompanyId == employee.CompanyId && s.IsActive)
            .OrderBy(s => s.StartTime)
            .FirstOrDefaultAsync(ct);

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
            $"{employee.FirstName} {employee.LastName}",
            now, matchedLocation.Name, isLate, lateMinutes);

        await line.ReplyFlexMessageAsync(request.ReplyToken, "เช็คอินสำเร็จ", card, ct);
        return Unit.Value;
    }
}
