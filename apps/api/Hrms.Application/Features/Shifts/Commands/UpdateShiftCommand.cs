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
    bool IsActive) : IRequest<ShiftDto>;

public class UpdateShiftCommandValidator : AbstractValidator<UpdateShiftCommand>
{
    public UpdateShiftCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.GracePeriodMinutes).InclusiveBetween(0, 120);
        RuleFor(x => x).Must(x => x.StartTime.CompareTo(x.EndTime) < 0)
            .WithName("StartTime")
            .WithMessage("เวลาเข้างานต้องน้อยกว่าเวลาเลิกงาน");
    }
}

public class UpdateShiftHandler(IApplicationDbContext db, IScopeGuard scope)
    : IRequestHandler<UpdateShiftCommand, ShiftDto>
{
    public async Task<ShiftDto> Handle(UpdateShiftCommand request, CancellationToken ct)
    {
        var shift = await db.Shifts
            .Include(s => s.Company)
            .FirstOrDefaultAsync(s => s.Id == request.Id, ct)
            ?? throw new KeyNotFoundException($"ไม่พบ Shift Id '{request.Id}'");

        await scope.ThrowIfCannotAccessAsync(shift.CompanyId, ct);

        var duplicate = await db.Shifts
            .AnyAsync(s => s.CompanyId == shift.CompanyId
                        && s.Name == request.Name
                        && s.Id != request.Id
                        && s.IsActive, ct);
        if (duplicate)
            throw new ConflictException("DUPLICATE_SHIFT", $"ชื่อกะ '{request.Name}' มีอยู่แล้วใน company นี้");

        shift.Name               = request.Name;
        shift.StartTime          = request.StartTime;
        shift.EndTime            = request.EndTime;
        shift.GracePeriodMinutes = request.GracePeriodMinutes;
        shift.IsActive           = request.IsActive;

        await db.SaveChangesAsync(ct);

        return CreateShiftHandler.ToDto(shift);
    }
}
