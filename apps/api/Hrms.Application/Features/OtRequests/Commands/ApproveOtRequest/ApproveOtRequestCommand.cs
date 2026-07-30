using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.OtRequests.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.OtRequests.Commands.ApproveOtRequest;

public record ApproveOtRequestCommand(Guid OtRequestId, string? Comment) : IRequest<OtRequestDto>;

public class ApproveOtRequestHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permService,
    IAuditLogService auditLog)
    : IRequestHandler<ApproveOtRequestCommand, OtRequestDto>
{
    public async Task<OtRequestDto> Handle(ApproveOtRequestCommand request, CancellationToken ct)
    {
        var actorId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

        var ot = await db.OtRequests
            .Include(o => o.Employee).ThenInclude(e => e.Department)
            .FirstOrDefaultAsync(o => o.Id == request.OtRequestId, ct)
            ?? throw new KeyNotFoundException("ไม่พบคำขอ OT");

        var now = DateTime.UtcNow.AddHours(7);
        var oldStatus = ot.Status;

        switch (ot.Status)
        {
            case OtStatus.PendingSupervisor:
                await currentUser.ThrowIfNoPermissionAsync(permService, "ot:approve-supervisor", ct);
                ot.Status = OtStatus.PendingHr;
                ot.SupervisorId = actorId;
                ot.SupervisorComment = request.Comment;
                ot.SupervisorApprovedAt = now;
                break;

            case OtStatus.PendingHr:
                await currentUser.ThrowIfNoPermissionAsync(permService, "ot:approve-hr", ct);
                ot.Status = OtStatus.Approved;
                ot.HrId = actorId;
                ot.HrComment = request.Comment;
                ot.HrAcknowledgedAt = now;
                break;

            default:
                throw new ConflictException("INVALID_STATUS", "คำขอ OT นี้ไม่อยู่ในสถานะรออนุมัติ");
        }

        ot.UpdatedAt = now;
        await db.SaveChangesAsync(ct);

        var supervisorName = ot.SupervisorId.HasValue
            ? await db.Employees.Where(e => e.Id == ot.SupervisorId.Value)
                .Select(e => $"{e.FirstName} {e.LastName}".Trim()).FirstOrDefaultAsync(ct)
            : null;
        var hrName = ot.HrId.HasValue
            ? await db.Employees.Where(e => e.Id == ot.HrId.Value)
                .Select(e => $"{e.FirstName} {e.LastName}".Trim()).FirstOrDefaultAsync(ct)
            : null;

        await auditLog.LogAsync(
            module:      "ot",
            entityType:  "OtRequest",
            entityId:    ot.Id.ToString(),
            action:      "approve",
            description: $"อนุมัติ OT ของ {ot.Employee.FirstName} {ot.Employee.LastName} วันที่ {ot.Date:yyyy-MM-dd}: {oldStatus} → {ot.Status}",
            oldValues:   new { status = oldStatus.ToString() },
            newValues:   new { status = ot.Status.ToString(), comment = request.Comment },
            ct:          ct);

        return OtRequestMapper.ToDto(ot, ot.Employee.Department?.Name, supervisorName, hrName);
    }
}
