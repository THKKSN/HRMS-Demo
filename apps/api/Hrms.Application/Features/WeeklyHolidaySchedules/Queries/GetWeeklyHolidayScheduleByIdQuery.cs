using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.WeeklyHolidaySchedules.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.WeeklyHolidaySchedules.Queries;

public record GetWeeklyHolidayScheduleByIdQuery(Guid Id) : IRequest<WeeklyHolidayScheduleDto>;

public class GetWeeklyHolidayScheduleByIdHandler(IApplicationDbContext db, IScopeGuard scope)
    : IRequestHandler<GetWeeklyHolidayScheduleByIdQuery, WeeklyHolidayScheduleDto>
{
    public async Task<WeeklyHolidayScheduleDto> Handle(
        GetWeeklyHolidayScheduleByIdQuery request, CancellationToken ct)
    {
        var schedule = await db.WeeklyHolidaySchedules
            .Include(s => s.Company)
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == request.Id, ct)
            ?? throw new KeyNotFoundException($"ไม่พบ WeeklyHolidaySchedule Id '{request.Id}'");

        if (schedule.CompanyId.HasValue)
            await scope.ThrowIfCannotAccessAsync(schedule.CompanyId.Value, ct);

        return GetWeeklyHolidaySchedulesHandler.ToDto(schedule);
    }
}
