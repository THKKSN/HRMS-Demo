using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Leaves.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Leaves.Queries.GetLeaveRequestById;

public class GetLeaveRequestByIdHandler(IApplicationDbContext db, ICurrentUser currentUser)
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

        var isOwner = r.EmployeeId == employeeId;
        var isPrivileged = currentUser.IsSupervisorOrAbove();

        if (!isOwner && !isPrivileged)
            throw new AppForbiddenException("ไม่มีสิทธิ์ดูคำขอลานี้");

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
            r.AttachmentUrl,
            r.Status,
            r.SupervisorComment,
            r.HrComment,
            r.CreatedAt);
    }
}
