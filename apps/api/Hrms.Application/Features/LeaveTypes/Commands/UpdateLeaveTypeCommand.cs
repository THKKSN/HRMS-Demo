using FluentValidation;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.LeaveTypes.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.LeaveTypes.Commands;

public record UpdateLeaveTypeCommand(
    Guid Id,
    string NameTh,
    string? NameEn,
    int DefaultDaysPerYear,
    bool RequiresAttachment) : IRequest<LeaveTypeDto>;

public class UpdateLeaveTypeValidator : AbstractValidator<UpdateLeaveTypeCommand>
{
    public UpdateLeaveTypeValidator()
    {
        RuleFor(x => x.NameTh).NotEmpty().MaximumLength(100);
        RuleFor(x => x.DefaultDaysPerYear).GreaterThanOrEqualTo(0);
    }
}

public class UpdateLeaveTypeHandler(IApplicationDbContext db, IAuditLogService auditLog)
    : IRequestHandler<UpdateLeaveTypeCommand, LeaveTypeDto>
{
    public async Task<LeaveTypeDto> Handle(UpdateLeaveTypeCommand request, CancellationToken ct)
    {
        var leaveType = await db.LeaveTypes.FirstOrDefaultAsync(lt => lt.Id == request.Id, ct)
            ?? throw new KeyNotFoundException("ไม่พบประเภทการลา");

        var oldValues = new { leaveType.NameTh, leaveType.NameEn, leaveType.DefaultDaysPerYear, leaveType.RequiresAttachment };

        leaveType.NameTh             = request.NameTh;
        leaveType.NameEn             = request.NameEn;
        leaveType.DefaultDaysPerYear = request.DefaultDaysPerYear;
        leaveType.RequiresAttachment = request.RequiresAttachment;
        leaveType.UpdatedAt          = DateTime.UtcNow.AddHours(7);

        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module:      "leave-type",
            entityType:  "LeaveType",
            entityId:    leaveType.Id.ToString(),
            action:      "update",
            description: $"แก้ไขประเภทการลา '{leaveType.NameTh}'",
            oldValues:   oldValues,
            newValues:   new { leaveType.NameTh, leaveType.NameEn, leaveType.DefaultDaysPerYear, leaveType.RequiresAttachment },
            ct:          ct);

        return new LeaveTypeDto(leaveType.Id, leaveType.Code, leaveType.NameTh, leaveType.NameEn,
            leaveType.DefaultDaysPerYear, leaveType.RequiresAttachment, leaveType.IsActive);
    }
}
