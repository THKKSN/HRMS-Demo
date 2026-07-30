using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Leaves.Commands.CreateLeaveRequest;
using Hrms.Application.Features.Leaves.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Leaves.Queries.GetLeaveRequestById;

public class GetLeaveRequestByIdHandler(IApplicationDbContext db, ICurrentUser currentUser, IPermissionService permService)
    : IRequestHandler<GetLeaveRequestByIdQuery, LeaveRequestDto>
{
    public async Task<LeaveRequestDto> Handle(GetLeaveRequestByIdQuery request, CancellationToken ct)
    {
        var employeeId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

        var r = await db.LeaveRequests
            .Include(x => x.Employee)
            .Include(x => x.LeaveType)
            .FirstOrDefaultAsync(x => x.Id == request.Id, ct)
            ?? throw new KeyNotFoundException("ไม่พบคำขอลาที่ระบุ");

        var isOwner     = r.EmployeeId == employeeId;
        var canViewTeam = await permService.HasPermissionAsync(currentUser, "leave:view-team", ct);

        if (!isOwner && !canViewTeam)
            throw new AppForbiddenException("ไม่มีสิทธิ์ดูคำขอลานี้");

        var (supervisorName, hrName) = await LookupApproverNamesAsync(db, r.SupervisorId, r.HrId, ct);

        return new LeaveRequestDto(
            r.Id,
            r.Employee.Id,
            $"{r.Employee.FirstName} {r.Employee.LastName}".Trim(),
            r.LeaveType.NameTh,
            r.DateFrom,
            r.DateTo,
            r.HalfDay,
            r.TimeFrom,
            r.TimeTo,
            r.TotalDays,
            r.Reason,
            CreateLeaveRequestHandler.ParseUrls(r.AttachmentUrl),
            r.Status,
            supervisorName,
            r.SupervisorComment,
            hrName,
            r.HrComment,
            r.CreatedAt);
    }

    internal static async Task<(string? supervisorName, string? hrName)> LookupApproverNamesAsync(
        IApplicationDbContext db, Guid? supervisorId, Guid? hrId, CancellationToken ct)
    {
        var ids = new[] { supervisorId, hrId }
            .Where(id => id.HasValue)
            .Select(id => id!.Value)
            .Distinct()
            .ToList();

        if (ids.Count == 0) return (null, null);

        var names = await db.Employees
            .Where(e => ids.Contains(e.Id))
            .Select(e => new { e.Id, Name = (e.FirstName + " " + e.LastName).Trim() })
            .ToDictionaryAsync(e => e.Id, e => e.Name, ct);

        var supervisorName = supervisorId.HasValue && names.TryGetValue(supervisorId.Value, out var sn) ? sn : null;
        var hrName         = hrId.HasValue         && names.TryGetValue(hrId.Value,         out var hn) ? hn : null;

        return (supervisorName, hrName);
    }
}
