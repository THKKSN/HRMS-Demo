using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Attendance.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Attendance.Queries.GetAttendanceRecordById;

public class GetAttendanceRecordByIdHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permService)
    : IRequestHandler<GetAttendanceRecordByIdQuery, AttendanceRecordHrDto>
{
    public async Task<AttendanceRecordHrDto> Handle(
        GetAttendanceRecordByIdQuery request, CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permService, "attendance:edit", ct);

        var companyId = currentUser.CompanyId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

        var r = await db.AttendanceRecords
            .Include(x => x.Employee).ThenInclude(e => e.Department)
            .Include(x => x.Location)
            .Where(x => x.Id == request.Id && x.Employee.CompanyId == companyId)
            .FirstOrDefaultAsync(ct)
            ?? throw new KeyNotFoundException("ไม่พบบันทึกการเข้างาน");

        return new AttendanceRecordHrDto(
            r.Id,
            r.EmployeeId,
            $"{r.Employee.FirstName} {r.Employee.LastName}".Trim(),
            r.Employee.EmployeeCode,
            r.Employee.Company?.Name,
            r.Employee.Department?.Name,
            r.Date,
            r.CheckInTime,
            r.CheckOutTime,
            r.CheckInLatitude,
            r.CheckInLongitude,
            r.CheckInSelfieUrl,
            r.CheckOutSelfieUrl,
            r.LocationId,
            r.Location?.Name,
            r.IsLate,
            r.LateMinutes,
            WorkDurationMinutes: r.CheckInTime.HasValue && r.CheckOutTime.HasValue
                ? (int)(r.CheckOutTime.Value - r.CheckInTime.Value).TotalMinutes
                : null,
            r.Status,
            r.Remark,
            r.CreatedAt,
            r.UpdatedAt);
    }
}
