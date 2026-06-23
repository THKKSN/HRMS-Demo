using FluentValidation;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.WeeklyHolidaySchedules.Dtos;
using Hrms.Application.Features.WeeklyHolidaySchedules.Queries;
using Hrms.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.WeeklyHolidaySchedules.Commands;

public record CreateWeeklyHolidayScheduleCommand(
    Guid? CompanyId,
    string Name,
    DayOfWeek DayOfWeek,
    List<int> WorkDayOccurrences) : IRequest<WeeklyHolidayScheduleDto>;

public class CreateWeeklyHolidayScheduleValidator : AbstractValidator<CreateWeeklyHolidayScheduleCommand>
{
    public CreateWeeklyHolidayScheduleValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.DayOfWeek).IsInEnum();
        RuleForEach(x => x.WorkDayOccurrences).InclusiveBetween(1, 5)
            .WithMessage("occurrence ต้องอยู่ระหว่าง 1–5");
    }
}

public class CreateWeeklyHolidayScheduleHandler(IApplicationDbContext db, IScopeGuard scope)
    : IRequestHandler<CreateWeeklyHolidayScheduleCommand, WeeklyHolidayScheduleDto>
{
    public async Task<WeeklyHolidayScheduleDto> Handle(
        CreateWeeklyHolidayScheduleCommand request, CancellationToken ct)
    {
        if (request.CompanyId.HasValue)
        {
            await scope.ThrowIfCannotAccessAsync(request.CompanyId.Value, ct);
            var exists = await db.Companies.AnyAsync(c => c.Id == request.CompanyId.Value && c.IsActive, ct);
            if (!exists)
                throw new KeyNotFoundException($"ไม่พบ Company Id '{request.CompanyId}'");
        }

        var schedule = new WeeklyHolidaySchedule
        {
            CompanyId          = request.CompanyId,
            Name               = request.Name,
            DayOfWeek          = request.DayOfWeek,
            WorkDayOccurrences = request.WorkDayOccurrences.Distinct().OrderBy(x => x).ToList(),
        };

        db.WeeklyHolidaySchedules.Add(schedule);
        await db.SaveChangesAsync(ct);

        if (schedule.CompanyId.HasValue)
            schedule.Company = await db.Companies
                .FirstOrDefaultAsync(c => c.Id == schedule.CompanyId.Value, ct);

        return GetWeeklyHolidaySchedulesHandler.ToDto(schedule);
    }
}
