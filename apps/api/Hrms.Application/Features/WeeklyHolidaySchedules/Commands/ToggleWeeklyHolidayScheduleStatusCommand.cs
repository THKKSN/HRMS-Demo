using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.WeeklyHolidaySchedules.Dtos;
using Hrms.Application.Features.WeeklyHolidaySchedules.Queries;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.WeeklyHolidaySchedules.Commands;

public record ToggleWeeklyHolidayScheduleStatusCommand(Guid Id, bool IsActive)
    : IRequest<WeeklyHolidayScheduleDto>;

public class ToggleWeeklyHolidayScheduleStatusHandler(IApplicationDbContext db, IScopeGuard scope)
    : IRequestHandler<ToggleWeeklyHolidayScheduleStatusCommand, WeeklyHolidayScheduleDto>
{
    public async Task<WeeklyHolidayScheduleDto> Handle(
        ToggleWeeklyHolidayScheduleStatusCommand request, CancellationToken ct)
    {
        var schedule = await db.WeeklyHolidaySchedules
            .Include(s => s.Company)
            .FirstOrDefaultAsync(s => s.Id == request.Id, ct)
            ?? throw new KeyNotFoundException($"ไม่พบ WeeklyHolidaySchedule Id '{request.Id}'");

        if (schedule.CompanyId.HasValue)
            await scope.ThrowIfCannotAccessAsync(schedule.CompanyId.Value, ct);

        schedule.IsActive = request.IsActive;
        await db.SaveChangesAsync(ct);
        return GetWeeklyHolidaySchedulesHandler.ToDto(schedule);
    }
}
