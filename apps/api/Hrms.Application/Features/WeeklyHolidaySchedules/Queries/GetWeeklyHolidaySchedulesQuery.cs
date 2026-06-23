using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.WeeklyHolidaySchedules.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.WeeklyHolidaySchedules.Queries;

public record GetWeeklyHolidaySchedulesQuery(
    Guid? CompanyId,
    bool IncludeInactive = false) : IRequest<List<WeeklyHolidayScheduleDto>>;

public class GetWeeklyHolidaySchedulesHandler(IApplicationDbContext db, IScopeGuard scope)
    : IRequestHandler<GetWeeklyHolidaySchedulesQuery, List<WeeklyHolidayScheduleDto>>
{
    public async Task<List<WeeklyHolidayScheduleDto>> Handle(
        GetWeeklyHolidaySchedulesQuery request, CancellationToken ct)
    {
        var accessibleIds = await scope.GetAccessibleCompanyIdsAsync(ct);

        var query = db.WeeklyHolidaySchedules
            .Include(s => s.Company)
            .AsNoTracking();

        if (!request.IncludeInactive)
            query = query.Where(s => s.IsActive);

        // filter scope
        if (accessibleIds is not null)
            query = query.Where(s => s.CompanyId == null || accessibleIds.Contains(s.CompanyId.Value));

        // filter ตาม companyId ที่ระบุ
        if (request.CompanyId.HasValue)
            query = query.Where(s => s.CompanyId == request.CompanyId.Value);

        var list = await query.OrderBy(s => s.DayOfWeek).ThenBy(s => s.Name).ToListAsync(ct);
        return list.Select(ToDto).ToList();
    }

    internal static WeeklyHolidayScheduleDto ToDto(Domain.Entities.WeeklyHolidaySchedule s) => new(
        s.Id,
        s.CompanyId,
        s.Company?.Name,
        s.Name,
        s.DayOfWeek,
        s.WorkDayOccurrences,
        s.IsActive);
}
