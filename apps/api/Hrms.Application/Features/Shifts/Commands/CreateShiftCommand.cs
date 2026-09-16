using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Shifts.Dtos;
using Hrms.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Shifts.Commands;

public record CreateShiftCommand(
    Guid CompanyId,
    string Name,
    TimeOnly StartTime,
    TimeOnly EndTime,
    int GracePeriodMinutes,
    string? NameEn = null,
    string? NameId = null) : IRequest<ShiftDto>;

public class CreateShiftCommandValidator : AbstractValidator<CreateShiftCommand>
{
    public CreateShiftCommandValidator()
    {
        RuleFor(x => x.CompanyId).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.NameEn).MaximumLength(100).When(x => x.NameEn is not null);
        RuleFor(x => x.NameId).MaximumLength(100).When(x => x.NameId is not null);
        RuleFor(x => x.GracePeriodMinutes).InclusiveBetween(0, 120);
        RuleFor(x => x).Must(x => x.StartTime.CompareTo(x.EndTime) < 0)
            .WithName("StartTime")
            .WithErrorCode("SHIFT_TIME_RANGE_INVALID").WithMessage("The shift start time must be earlier than the end time.");
    }
}

public class CreateShiftHandler(IApplicationDbContext db, IScopeGuard scope, IAuditLogService auditLog)
    : IRequestHandler<CreateShiftCommand, ShiftDto>
{
    public async Task<ShiftDto> Handle(CreateShiftCommand request, CancellationToken ct)
    {
        await scope.ThrowIfCannotAccessAsync(request.CompanyId, ct);

        var companyExists = await db.Companies
            .AnyAsync(c => c.Id == request.CompanyId && c.IsActive, ct);
        if (!companyExists)
            throw new NotFoundException("Company", request.CompanyId, "COMPANY_NOT_FOUND");

        var duplicate = await db.Shifts
            .AnyAsync(s => s.CompanyId == request.CompanyId
                        && s.Name == request.Name
                        && s.IsActive, ct);
        if (duplicate)
            throw new ConflictException("DUPLICATE_SHIFT", $"Shift '{request.Name}' already exists in this company.");

        var shift = new Shift
        {
            CompanyId           = request.CompanyId,
            Name                = request.Name,
            NameEn              = Common.Helpers.NameText.Normalize(request.NameEn),
            NameId              = Common.Helpers.NameText.Normalize(request.NameId),
            StartTime           = request.StartTime,
            EndTime             = request.EndTime,
            GracePeriodMinutes  = request.GracePeriodMinutes,
            IsActive            = true,
        };

        db.Shifts.Add(shift);
        await db.SaveChangesAsync(ct);

        shift.Company = await db.Companies.FirstAsync(c => c.Id == shift.CompanyId, ct);

        await auditLog.LogAsync(
            module:      "shift",
            entityType:  "Shift",
            entityId:    shift.Id.ToString(),
            action:      "create",
            description: $"สร้างกะงาน '{shift.Name}' ({shift.StartTime}–{shift.EndTime})",
            oldValues:   null,
            newValues:   new { shift.Name, shift.StartTime, shift.EndTime, shift.GracePeriodMinutes, shift.CompanyId },
            ct:          ct);

        return ToDto(shift);
    }

    internal static ShiftDto ToDto(Shift s) => new(
        s.Id,
        s.CompanyId,
        s.Company?.Name ?? string.Empty,
        s.Name,
        s.StartTime,
        s.EndTime,
        s.GracePeriodMinutes,
        s.IsActive,
        s.NameEn,
        s.NameId);
}
