using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.WeeklyHolidaySchedules.Dtos;
using Hrms.Application.Features.WeeklyHolidaySchedules.Queries;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.WeeklyHolidaySchedules.Commands;

public record ToggleWeeklyHolidayScheduleStatusCommand(Guid Id, bool IsActive)
    : IRequest<WeeklyHolidayScheduleDto>;

public class ToggleWeeklyHolidayScheduleStatusHandler(IApplicationDbContext db, IScopeGuard scope, IAuditLogService auditLog)
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

        var oldIsActive = schedule.IsActive;
        schedule.IsActive = request.IsActive;
        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module:      "weekly-holiday",
            entityType:  "WeeklyHolidaySchedule",
            entityId:    schedule.Id.ToString(),
            action:      request.IsActive ? "activate" : "deactivate",
            description: $"{(request.IsActive ? "เปิด" : "ปิด")}ใช้งานตารางวันหยุด '{schedule.Name}'",
            oldValues:   new { isActive = oldIsActive },
            newValues:   new { isActive = request.IsActive },
            ct:          ct);

        return GetWeeklyHolidaySchedulesHandler.ToDto(schedule);
    }
}
