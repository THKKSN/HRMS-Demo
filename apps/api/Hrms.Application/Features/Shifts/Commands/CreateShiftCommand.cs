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
    int GracePeriodMinutes) : IRequest<ShiftDto>;

public class CreateShiftCommandValidator : AbstractValidator<CreateShiftCommand>
{
    public CreateShiftCommandValidator()
    {
        RuleFor(x => x.CompanyId).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.GracePeriodMinutes).InclusiveBetween(0, 120);
        RuleFor(x => x).Must(x => x.StartTime.CompareTo(x.EndTime) < 0)
            .WithName("StartTime")
            .WithMessage("เวลาเข้างานต้องน้อยกว่าเวลาเลิกงาน");
    }
}

public class CreateShiftHandler(IApplicationDbContext db, IScopeGuard scope)
    : IRequestHandler<CreateShiftCommand, ShiftDto>
{
    public async Task<ShiftDto> Handle(CreateShiftCommand request, CancellationToken ct)
    {
        await scope.ThrowIfCannotAccessAsync(request.CompanyId, ct);

        var companyExists = await db.Companies
            .AnyAsync(c => c.Id == request.CompanyId && c.IsActive, ct);
        if (!companyExists)
            throw new KeyNotFoundException($"ไม่พบ Company Id '{request.CompanyId}'");

        var duplicate = await db.Shifts
            .AnyAsync(s => s.CompanyId == request.CompanyId
                        && s.Name == request.Name
                        && s.IsActive, ct);
        if (duplicate)
            throw new ConflictException("DUPLICATE_SHIFT", $"ชื่อกะ '{request.Name}' มีอยู่แล้วใน company นี้");

        var shift = new Shift
        {
            CompanyId           = request.CompanyId,
            Name                = request.Name,
            StartTime           = request.StartTime,
            EndTime             = request.EndTime,
            GracePeriodMinutes  = request.GracePeriodMinutes,
            IsActive            = true,
        };

        db.Shifts.Add(shift);
        await db.SaveChangesAsync(ct);

        shift.Company = await db.Companies.FirstAsync(c => c.Id == shift.CompanyId, ct);

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
        s.IsActive);
}
