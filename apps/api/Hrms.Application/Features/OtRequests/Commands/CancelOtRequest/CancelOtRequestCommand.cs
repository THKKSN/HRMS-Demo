using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.OtRequests.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.OtRequests.Commands.CancelOtRequest;

public record CancelOtRequestCommand(Guid OtRequestId) : IRequest<OtRequestDto>;

public class CancelOtRequestHandler(IApplicationDbContext db, ICurrentUser currentUser, IAuditLogService auditLog)
    : IRequestHandler<CancelOtRequestCommand, OtRequestDto>
{
    public async Task<OtRequestDto> Handle(CancelOtRequestCommand request, CancellationToken ct)
    {
        var employeeId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

        var ot = await db.OtRequests
            .Include(o => o.Employee).ThenInclude(e => e.Department)
            .FirstOrDefaultAsync(o => o.Id == request.OtRequestId, ct)
            ?? throw new KeyNotFoundException("ไม่พบคำขอ OT");

        if (ot.EmployeeId != employeeId)
            throw new AppForbiddenException("ไม่มีสิทธิ์ยกเลิกคำขอนี้");

        if (ot.Status == OtStatus.Approved || ot.Status == OtStatus.Rejected || ot.Status == OtStatus.Cancelled)
            throw new ConflictException("INVALID_STATUS", "ไม่สามารถยกเลิกคำขอ OT ที่อนุมัติ/ปฏิเสธแล้วได้");

        var oldStatus = ot.Status;
        ot.Status = OtStatus.Cancelled;
        ot.UpdatedAt = DateTime.UtcNow.AddHours(7);
        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module:      "ot",
            entityType:  "OtRequest",
            entityId:    ot.Id.ToString(),
            action:      "cancel",
            description: $"{ot.Employee.FirstName} {ot.Employee.LastName} ยกเลิกคำขอ OT วันที่ {ot.Date:yyyy-MM-dd}",
            oldValues:   new { status = oldStatus.ToString() },
            newValues:   new { status = "Cancelled" },
            ct:          ct);

        return OtRequestMapper.ToDto(ot, ot.Employee.Department?.Name, null, null);
    }
}
