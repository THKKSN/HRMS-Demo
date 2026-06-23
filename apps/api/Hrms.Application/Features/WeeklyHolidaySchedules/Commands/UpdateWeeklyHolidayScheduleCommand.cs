using FluentValidation;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.WeeklyHolidaySchedules.Dtos;
using Hrms.Application.Features.WeeklyHolidaySchedules.Queries;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.WeeklyHolidaySchedules.Commands;

public record UpdateWeeklyHolidayScheduleCommand(
    Guid Id,
    string Name,
    DayOfWeek DayOfWeek,
    List<int> WorkDayOccurrences,
    bool IsActive) : IRequest<WeeklyHolidayScheduleDto>;

public class UpdateWeeklyHolidayScheduleValidator : AbstractValidator<UpdateWeeklyHolidayScheduleCommand>
{
    public UpdateWeeklyHolidayScheduleValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.DayOfWeek).IsInEnum();
        RuleForEach(x => x.WorkDayOccurrences).InclusiveBetween(1, 5)
            .WithMessage("occurrence ต้องอยู่ระหว่าง 1–5");
    }
}

public class UpdateWeeklyHolidayScheduleHandler(IApplicationDbContext db, IScopeGuard scope)
    : IRequestHandler<UpdateWeeklyHolidayScheduleCommand, WeeklyHolidayScheduleDto>
{
    public async Task<WeeklyHolidayScheduleDto> Handle(
        UpdateWeeklyHolidayScheduleCommand request, CancellationToken ct)
    {
        var schedule = await db.WeeklyHolidaySchedules
            .Include(s => s.Company)
            .FirstOrDefaultAsync(s => s.Id == request.Id, ct)
            ?? throw new KeyNotFoundException($"ไม่พบ WeeklyHolidaySchedule Id '{request.Id}'");

        if (schedule.CompanyId.HasValue)
            await scope.ThrowIfCannotAccessAsync(schedule.CompanyId.Value, ct);

        schedule.Name               = request.Name;
        schedule.DayOfWeek          = request.DayOfWeek;
        schedule.WorkDayOccurrences = request.WorkDayOccurrences.Distinct().OrderBy(x => x).ToList();
        schedule.IsActive           = request.IsActive;

        await db.SaveChangesAsync(ct);
        return GetWeeklyHolidaySchedulesHandler.ToDto(schedule);
    }
}
