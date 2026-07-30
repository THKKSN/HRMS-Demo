using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.Attendance.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Attendance.Queries.GetAttendanceRecords;

public class GetAttendanceRecordsHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permService,
    IScopeGuard scope)
    : IRequestHandler<GetAttendanceRecordsQuery, PagedResult<AttendanceRecordHrDto>>
{
    public async Task<PagedResult<AttendanceRecordHrDto>> Handle(
        GetAttendanceRecordsQuery request, CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permService, "attendance:edit", ct);

        if (!currentUser.IsAuthenticated)
            throw new AppUnauthorizedException("UNAUTHENTICATED");

        // null → Admin/HQ HR เข้าได้ทุก company, HashSet → เฉพาะ company ที่เข้าได้
        var accessibleIds = await scope.GetAccessibleCompanyIdsAsync(ct);

        var query = db.AttendanceRecords
            .Include(r => r.Employee).ThenInclude(e => e.Company)
            .Include(r => r.Employee).ThenInclude(e => e.Department)
            .Include(r => r.Location)
            .AsQueryable();

        if (accessibleIds != null)
            query = query.Where(r => accessibleIds.Contains(r.Employee.CompanyId));

        if (request.EmployeeId.HasValue)
            query = query.Where(r => r.EmployeeId == request.EmployeeId.Value);

        if (request.DepartmentId.HasValue)
            query = query.Where(r => r.Employee.DepartmentId == request.DepartmentId.Value);

        if (request.DateFrom.HasValue)
            query = query.Where(r => r.Date >= request.DateFrom.Value);

        if (request.DateTo.HasValue)
            query = query.Where(r => r.Date <= request.DateTo.Value);

        if (request.Status.HasValue)
            query = query.Where(r => r.Status == request.Status.Value);

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var s = request.Search.Trim().ToLower();
            query = query.Where(r =>
                (r.Employee.FirstName + " " + r.Employee.LastName).ToLower().Contains(s) ||
                r.Employee.EmployeeCode.ToLower().Contains(s));
        }

        if (request.CompanyId.HasValue)
            query = query.Where(r => r.Employee.CompanyId == request.CompanyId.Value);

        var totalCount = await query.CountAsync(ct);

        var page     = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 1, 100);

        var records = await query
            .OrderByDescending(r => r.Date)
            .ThenBy(r => r.Employee.EmployeeCode)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var items = records.Select(r => new AttendanceRecordHrDto(
            Id:                  r.Id,
            EmployeeId:          r.EmployeeId,
            EmployeeFullName:    $"{r.Employee.FirstName} {r.Employee.LastName}".Trim(),
            EmployeeCode:        r.Employee.EmployeeCode,
            CompanyName:         r.Employee.Company?.Name,
            DepartmentName:      r.Employee.Department?.Name,
            Date:                r.Date,
            CheckInTime:         r.CheckInTime,
            CheckOutTime:        r.CheckOutTime,
            CheckInLatitude:     r.CheckInLatitude,
            CheckInLongitude:    r.CheckInLongitude,
            CheckInSelfieUrl:    r.CheckInSelfieUrl,
            CheckOutSelfieUrl:   r.CheckOutSelfieUrl,
            LocationId:          r.LocationId,
            LocationName:        r.Location?.Name,
            IsLate:              r.IsLate,
            LateMinutes:         r.LateMinutes,
            WorkDurationMinutes: r.CheckInTime.HasValue && r.CheckOutTime.HasValue
                ? (int)(r.CheckOutTime.Value - r.CheckInTime.Value).TotalMinutes
                : null,
            Status:              r.Status,
            Remark:              r.Remark,
            CreatedAt:           r.CreatedAt,
            UpdatedAt:           r.UpdatedAt)).ToList();

        return new PagedResult<AttendanceRecordHrDto>(items, totalCount, page, pageSize);
    }
}
