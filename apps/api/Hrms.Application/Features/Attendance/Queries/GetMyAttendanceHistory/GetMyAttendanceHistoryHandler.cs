using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.Attendance.Common;
using Hrms.Application.Features.Attendance.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Attendance.Queries.GetMyAttendanceHistory;

public class GetMyAttendanceHistoryHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser)
    : IRequestHandler<GetMyAttendanceHistoryQuery, PagedResult<AttendanceRecordDto>>
{
    public async Task<PagedResult<AttendanceRecordDto>> Handle(
        GetMyAttendanceHistoryQuery request, CancellationToken ct)
    {
        var employeeId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

        var query = db.AttendanceRecords
            .Include(r => r.Employee)
            .Include(r => r.Location)
            .Where(r => r.EmployeeId == employeeId
                     && r.Date >= request.From
                     && r.Date <= request.To)
            .OrderByDescending(r => r.Date);

        var total = await query.CountAsync(ct);

        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(ct);

        return new PagedResult<AttendanceRecordDto>(
            items.Select(r => r.ToDto()).ToList(),
            total,
            request.Page,
            request.PageSize);
    }
}
