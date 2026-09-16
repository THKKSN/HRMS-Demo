using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Shifts.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Shifts.Commands;

public record UpdateShiftCommand(
    Guid Id,
    string Name,
    TimeOnly StartTime,
    TimeOnly EndTime,
    int GracePeriodMinutes,
    bool IsActive,
    string? NameEn = null,
    string? NameId = null) : IRequest<ShiftDto>;

public class UpdateShiftCommandValidator : AbstractValidator<UpdateShiftCommand>
{
    public UpdateShiftCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.NameEn).MaximumLength(100).When(x => x.NameEn is not null);
        RuleFor(x => x.NameId).MaximumLength(100).When(x => x.NameId is not null);
        RuleFor(x => x.GracePeriodMinutes).InclusiveBetween(0, 120);
        RuleFor(x => x).Must(x => x.StartTime.CompareTo(x.EndTime) < 0)
            .WithName("StartTime")
            .WithErrorCode("SHIFT_TIME_RANGE_INVALID").WithMessage("The shift start time must be earlier than the end time.");
    }
}

public class UpdateShiftHandler(IApplicationDbContext db, IScopeGuard scope, IAuditLogService auditLog)
    : IRequestHandler<UpdateShiftCommand, ShiftDto>
{
    public async Task<ShiftDto> Handle(UpdateShiftCommand request, CancellationToken ct)
    {
        var shift = await db.Shifts
            .Include(s => s.Company)
            .FirstOrDefaultAsync(s => s.Id == request.Id, ct)
            ?? throw new NotFoundException("Shift", request.Id, "SHIFT_NOT_FOUND");

        await scope.ThrowIfCannotAccessAsync(shift.CompanyId, ct);

        var duplicate = await db.Shifts
            .AnyAsync(s => s.CompanyId == shift.CompanyId
                        && s.Name == request.Name
                        && s.Id != request.Id
                        && s.IsActive, ct);
        if (duplicate)
            throw new ConflictException("DUPLICATE_SHIFT", $"Shift '{request.Name}' already exists in this company.");

        var oldValues = new { shift.Name, shift.StartTime, shift.EndTime, shift.GracePeriodMinutes, shift.IsActive };

        shift.Name               = request.Name;
        shift.NameEn             = Common.Helpers.NameText.Apply(shift.NameEn, request.NameEn);
        shift.NameId             = Common.Helpers.NameText.Apply(shift.NameId, request.NameId);
        shift.StartTime          = request.StartTime;
        shift.EndTime            = request.EndTime;
        shift.GracePeriodMinutes = request.GracePeriodMinutes;
        shift.IsActive           = request.IsActive;

        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module:      "shift",
            entityType:  "Shift",
            entityId:    shift.Id.ToString(),
            action:      "update",
            description: $"แก้ไขกะงาน '{shift.Name}'",
            oldValues:   oldValues,
            newValues:   new { shift.Name, shift.StartTime, shift.EndTime, shift.GracePeriodMinutes, shift.IsActive },
            ct:          ct);

        return CreateShiftHandler.ToDto(shift);
    }
}
