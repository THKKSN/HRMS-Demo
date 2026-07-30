using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Leaves.Commands.CreateLeaveRequest;
using Hrms.Application.Features.Leaves.Dtos;
using Hrms.Application.Features.Leaves.Queries.GetLeaveRequestById;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Leaves.Commands.ApproveLeaveRequest;

public class ApproveLeaveRequestHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permService,
    ILeaveNotificationService notification,
    IAuditLogService auditLog)
    : IRequestHandler<ApproveLeaveRequestCommand, LeaveRequestDto>
{
    public async Task<LeaveRequestDto> Handle(ApproveLeaveRequestCommand request, CancellationToken ct)
    {
        var actorId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

        var r = await db.LeaveRequests
            .Include(x => x.Employee)
            .Include(x => x.LeaveType)
            .FirstOrDefaultAsync(x => x.Id == request.LeaveRequestId, ct)
            ?? throw new KeyNotFoundException("ไม่พบคำขอลาที่ระบุ");

        var now = DateTime.UtcNow;

        switch (r.Status)
        {
            case LeaveStatus.PendingSupervisor:
                await currentUser.ThrowIfNoPermissionAsync(permService, "leave:approve-supervisor", ct);

                r.Status = LeaveStatus.PendingHr;
                r.SupervisorId = actorId;
                r.SupervisorComment = request.Comment;
                r.SupervisorApprovedAt = now;
                break;

            case LeaveStatus.PendingHr:
                await currentUser.ThrowIfNoPermissionAsync(permService, "leave:approve-hr", ct);

                r.Status = LeaveStatus.Approved;
                r.HrId = actorId;
                r.HrComment = request.Comment;
                r.HrApprovedAt = now;

                var balance = await db.LeaveBalances
                    .FirstOrDefaultAsync(b =>
                        b.EmployeeId == r.EmployeeId &&
                        b.LeaveTypeId == r.LeaveTypeId &&
                        b.Year == r.DateFrom.Year, ct);

                if (balance is not null)
                {
                    balance.UsedDays += r.TotalDays;
                    balance.PendingDays -= r.TotalDays;
                }
                break;

            default:
                throw new ConflictException("INVALID_STATUS", "คำขอนี้ไม่อยู่ในสถานะรออนุมัติ");
        }

        var oldStatus = r.Status == LeaveStatus.PendingHr ? LeaveStatus.PendingSupervisor : LeaveStatus.PendingHr;
        r.UpdatedAt = now;
        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module:      "leave",
            entityType:  "LeaveRequest",
            entityId:    r.Id.ToString(),
            action:      "approve",
            description: $"อนุมัติคำขอลาของ {r.Employee.FirstName} {r.Employee.LastName} ({r.LeaveType.NameTh} {r.DateFrom:yyyy-MM-dd} ถึง {r.DateTo:yyyy-MM-dd}) สถานะ: {oldStatus} → {r.Status}",
            oldValues:   new { status = oldStatus.ToString() },
            newValues:   new { status = r.Status.ToString(), comment = request.Comment },
            ct:          ct);

        if (r.Status == LeaveStatus.Approved)
            await notification.EnqueueResultAsync(r.Id);

        var (supervisorName, hrName) = await GetLeaveRequestByIdHandler.LookupApproverNamesAsync(db, r.SupervisorId, r.HrId, ct);

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
}
