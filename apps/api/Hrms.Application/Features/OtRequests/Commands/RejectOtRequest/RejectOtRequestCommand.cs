using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.OtRequests.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.OtRequests.Commands.RejectOtRequest;

public record RejectOtRequestCommand(Guid OtRequestId, string? Comment) : IRequest<OtRequestDto>;

public class RejectOtRequestValidator : AbstractValidator<RejectOtRequestCommand>
{
    public RejectOtRequestValidator()
    {
        RuleFor(x => x.Comment).NotEmpty().WithMessage("กรุณาระบุเหตุผลการปฏิเสธ").MaximumLength(500);
    }
}

public class RejectOtRequestHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permService,
    IAuditLogService auditLog)
    : IRequestHandler<RejectOtRequestCommand, OtRequestDto>
{
    public async Task<OtRequestDto> Handle(RejectOtRequestCommand request, CancellationToken ct)
    {
        var actorId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

        var ot = await db.OtRequests
            .Include(o => o.Employee).ThenInclude(e => e.Department)
            .FirstOrDefaultAsync(o => o.Id == request.OtRequestId, ct)
            ?? throw new KeyNotFoundException("ไม่พบคำขอ OT");

        if (ot.Status != OtStatus.PendingSupervisor && ot.Status != OtStatus.PendingHr)
            throw new ConflictException("INVALID_STATUS", "คำขอ OT นี้ไม่สามารถปฏิเสธได้");

        var permission = ot.Status == OtStatus.PendingSupervisor ? "ot:approve-supervisor" : "ot:approve-hr";
        await currentUser.ThrowIfNoPermissionAsync(permService, permission, ct);

        var oldStatus = ot.Status;
        var now = DateTime.UtcNow.AddHours(7);
        ot.Status = OtStatus.Rejected;
        ot.UpdatedAt = now;

        if (ot.Status == OtStatus.Rejected && oldStatus == OtStatus.PendingSupervisor)
        {
            ot.SupervisorId = actorId;
            ot.SupervisorComment = request.Comment;
            ot.SupervisorApprovedAt = now;
        }
        else
        {
            ot.HrId = actorId;
            ot.HrComment = request.Comment;
        }

        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module:      "ot",
            entityType:  "OtRequest",
            entityId:    ot.Id.ToString(),
            action:      "reject",
            description: $"ปฏิเสธ OT ของ {ot.Employee.FirstName} {ot.Employee.LastName} วันที่ {ot.Date:yyyy-MM-dd}: {oldStatus} → Rejected",
            oldValues:   new { status = oldStatus.ToString() },
            newValues:   new { status = "Rejected", comment = request.Comment },
            ct:          ct);

        return OtRequestMapper.ToDto(ot, ot.Employee.Department?.Name, null, null);
    }
}
