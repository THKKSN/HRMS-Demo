using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Attendance.Commands.HrCreateAttendanceRecord;

public class HrCreateAttendanceRecordHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permService,
    IAuditLogService auditLog,
    IScopeGuard scope)
    : IRequestHandler<HrCreateAttendanceRecordCommand, Guid>
{
    public async Task<Guid> Handle(HrCreateAttendanceRecordCommand request, CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permService, "attendance:edit", ct);

        var employee = await db.Employees
            .Where(e => e.Id == request.EmployeeId && e.IsActive)
            .FirstOrDefaultAsync(ct)
            ?? throw new KeyNotFoundException("ไม่พบข้อมูลพนักงาน");

        await scope.ThrowIfCannotAccessAsync(employee.CompanyId, ct);

        var duplicate = await db.AttendanceRecords
            .AnyAsync(r => r.EmployeeId == request.EmployeeId && r.Date == request.Date, ct);

        if (duplicate)
            throw new ConflictException("DUPLICATE_ATTENDANCE_DATE", $"พนักงานมีบันทึกการเข้างานวันที่ {request.Date:yyyy-MM-dd} แล้ว");

        var record = new AttendanceRecord
        {
            EmployeeId   = request.EmployeeId,
            Date         = request.Date,
            CheckInTime  = request.CheckInTime,
            CheckOutTime = request.CheckOutTime,
            IsLate       = request.IsLate,
            LateMinutes  = request.LateMinutes,
            Status       = request.Status,
            Remark       = request.Remark,
            CreatedAt    = DateTime.UtcNow.AddHours(7),
            UpdatedAt    = DateTime.UtcNow.AddHours(7),
        };

        db.AttendanceRecords.Add(record);
        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module:      "attendance",
            entityType:  "AttendanceRecord",
            entityId:    record.Id.ToString(),
            action:      "create",
            description: $"HR สร้างบันทึกการเข้างานของ {employee.FirstName} {employee.LastName} วันที่ {request.Date:yyyy-MM-dd}",
            oldValues:   null,
            newValues:   new { request.Date, request.CheckInTime, request.CheckOutTime, request.Status, request.IsLate, request.LateMinutes, request.Remark },
            ct:          ct);

        return record.Id;
    }
}
