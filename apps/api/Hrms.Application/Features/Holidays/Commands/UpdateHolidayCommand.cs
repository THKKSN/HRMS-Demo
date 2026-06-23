using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Holidays.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Holidays.Commands;

public record UpdateHolidayCommand(
    Guid Id,
    string Name,
    DateOnly Date,
    bool IsActive) : IRequest<HolidayDto>;

public class UpdateHolidayCommandValidator : AbstractValidator<UpdateHolidayCommand>
{
    public UpdateHolidayCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Date).NotEmpty();
    }
}

public class UpdateHolidayHandler(IApplicationDbContext db, IScopeGuard scope)
    : IRequestHandler<UpdateHolidayCommand, HolidayDto>
{
    public async Task<HolidayDto> Handle(UpdateHolidayCommand request, CancellationToken ct)
    {
        var holiday = await db.Holidays
            .Include(h => h.Company)
            .FirstOrDefaultAsync(h => h.Id == request.Id, ct)
            ?? throw new KeyNotFoundException($"ไม่พบ Holiday Id '{request.Id}'");

        if (holiday.CompanyId.HasValue)
            await scope.ThrowIfCannotAccessAsync(holiday.CompanyId.Value, ct);

        // ตรวจชื่อซ้ำวันเดิม (ยกเว้น record ตัวเอง)
        var duplicate = await db.Holidays.AnyAsync(
            h => h.Date == request.Date
              && h.CompanyId == holiday.CompanyId
              && h.Id != request.Id
              && h.IsActive, ct);
        if (duplicate)
            throw new ConflictException("DUPLICATE_HOLIDAY", $"มีวันหยุดในวันที่ {request.Date:yyyy-MM-dd} ของ scope นี้อยู่แล้ว");

        holiday.Name     = request.Name;
        holiday.Date     = request.Date;
        holiday.IsActive = request.IsActive;

        await db.SaveChangesAsync(ct);

        return CreateHolidayHandler.ToDto(holiday);
    }
}
