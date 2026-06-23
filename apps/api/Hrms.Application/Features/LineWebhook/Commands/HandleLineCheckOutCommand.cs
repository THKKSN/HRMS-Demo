using Hrms.Application.Common.Helpers;
using Hrms.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.LineWebhook.Commands;

public record HandleLineCheckOutCommand(
    string LineUserId,
    string ReplyToken,
    double Latitude,
    double Longitude) : IRequest<Unit>;

public class HandleLineCheckOutHandler(
    IApplicationDbContext db,
    ILineMessagingService line,
    IGeofenceService geofence)
    : IRequestHandler<HandleLineCheckOutCommand, Unit>
{
    public async Task<Unit> Handle(HandleLineCheckOutCommand request, CancellationToken ct)
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

        var record = await db.AttendanceRecords
            .FirstOrDefaultAsync(r => r.EmployeeId == employee.Id && r.Date == today, ct);

        if (record?.CheckInTime == null)
        {
            await line.ReplyAsync(request.ReplyToken,
                "ยังไม่ได้เช็คอินวันนี้ กรุณากด 'ลงเวลา' เพื่อเช็คอินก่อน", ct);
            return Unit.Value;
        }

        if (record.CheckOutTime != null)
        {
            await line.ReplyAsync(request.ReplyToken,
                $"คุณเช็คเอาต์วันนี้ไปแล้ว เวลา {record.CheckOutTime.Value.ToString("HH:mm")} น.", ct);
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
                "ตำแหน่งปัจจุบันอยู่นอกพื้นที่ที่กำหนด กรุณาเช็คเอาต์ในบริเวณสำนักงาน 📍", ct);
            return Unit.Value;
        }

        record.CheckOutTime      = now;
        record.CheckOutLatitude  = request.Latitude;
        record.CheckOutLongitude = request.Longitude;

        await db.SaveChangesAsync(ct);

        var locationName = matchedLocation.Name;
        var card = LineFlexBuilder.BuildCheckOutResultCard(
            $"{employee.FirstName} {employee.LastName}",
            record.CheckInTime.Value, now, locationName);

        await line.ReplyFlexMessageAsync(request.ReplyToken, "เช็คเอาต์สำเร็จ", card, ct);
        return Unit.Value;
    }
}
