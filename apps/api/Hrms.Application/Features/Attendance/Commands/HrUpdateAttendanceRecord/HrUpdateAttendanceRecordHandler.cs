using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Attendance.Commands.HrUpdateAttendanceRecord;

public class HrUpdateAttendanceRecordHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permService,
    IAuditLogService auditLog,
    IScopeGuard scope)
    : IRequestHandler<HrUpdateAttendanceRecordCommand>
{
    public async Task Handle(HrUpdateAttendanceRecordCommand request, CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permService, "attendance:edit", ct);

        var record = await db.AttendanceRecords
            .Include(r => r.Employee)
            .FirstOrDefaultAsync(r => r.Id == request.Id, ct)
            ?? throw new KeyNotFoundException("ไม่พบบันทึกการเข้างาน");

        await scope.ThrowIfCannotAccessAsync(record.Employee.CompanyId, ct);

        var old = new
        {
            record.CheckInTime,
            record.CheckOutTime,
            record.IsLate,
            record.LateMinutes,
            record.Status,
            record.Remark,
        };

        record.CheckInTime  = request.CheckInTime;
        record.CheckOutTime = request.CheckOutTime;
        record.IsLate       = request.IsLate;
        record.LateMinutes  = request.LateMinutes;
        record.Status       = request.Status;
        record.Remark       = request.Remark;

        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module:      "attendance",
            entityType:  "AttendanceRecord",
            entityId:    record.Id.ToString(),
            action:      "update",
            description: $"HR แก้ไขบันทึกการเข้างานของ {record.Employee.FirstName} {record.Employee.LastName} วันที่ {record.Date:yyyy-MM-dd}",
            oldValues:   old,
            newValues:   new { request.CheckInTime, request.CheckOutTime, request.IsLate, request.LateMinutes, request.Status, request.Remark },
            ct:          ct);
    }
}
