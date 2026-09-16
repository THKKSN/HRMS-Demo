using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.LeaveTypes.Dtos;
using Hrms.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.LeaveTypes.Commands;

public record CreateLeaveTypeCommand(
    string Code,
    string NameTh,
    string? NameEn,
    int DefaultDaysPerYear,
    bool RequiresAttachment,
    string? NameId = null) : IRequest<LeaveTypeDto>;

public class CreateLeaveTypeValidator : AbstractValidator<CreateLeaveTypeCommand>
{
    public CreateLeaveTypeValidator()
    {
        RuleFor(x => x.Code).NotEmpty().MaximumLength(20);
        RuleFor(x => x.NameTh).NotEmpty().MaximumLength(100);
        RuleFor(x => x.NameEn).MaximumLength(100).When(x => x.NameEn is not null);
        RuleFor(x => x.NameId).MaximumLength(100).When(x => x.NameId is not null);
        RuleFor(x => x.DefaultDaysPerYear).GreaterThanOrEqualTo(0);
    }
}

public class CreateLeaveTypeHandler(IApplicationDbContext db, IAuditLogService auditLog)
    : IRequestHandler<CreateLeaveTypeCommand, LeaveTypeDto>
{
    public async Task<LeaveTypeDto> Handle(CreateLeaveTypeCommand request, CancellationToken ct)
    {
        if (await db.LeaveTypes.AnyAsync(lt => lt.Code == request.Code, ct))
            throw new ConflictException("DUPLICATE_CODE", $"Leave type code '{request.Code}' already exists.");

        var leaveType = new LeaveType
        {
            Code               = request.Code,
            NameTh             = request.NameTh,
            NameEn             = request.NameEn,
            NameId             = Common.Helpers.NameText.Normalize(request.NameId),
            DefaultDaysPerYear = request.DefaultDaysPerYear,
            RequiresAttachment = request.RequiresAttachment,
            IsActive           = true,
            CreatedAt          = DateTime.UtcNow,
            UpdatedAt          = DateTime.UtcNow,
        };

        db.LeaveTypes.Add(leaveType);
        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module:      "leave-type",
            entityType:  "LeaveType",
            entityId:    leaveType.Id.ToString(),
            action:      "create",
            description: $"สร้างประเภทการลา '{leaveType.NameTh}' (Code: {leaveType.Code})",
            oldValues:   null,
            newValues:   new { leaveType.Code, leaveType.NameTh, leaveType.DefaultDaysPerYear, leaveType.RequiresAttachment },
            ct:          ct);

        return new LeaveTypeDto(leaveType.Id, leaveType.Code, leaveType.NameTh, leaveType.NameEn,
            leaveType.DefaultDaysPerYear, leaveType.RequiresAttachment, leaveType.IsActive, leaveType.NameId);
    }
}
