using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Holidays.Commands;
using Hrms.Application.Features.Holidays.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Holidays.Queries;

public record GetHolidayByIdQuery(Guid Id) : IRequest<HolidayDto>;

public class GetHolidayByIdHandler(IApplicationDbContext db, IScopeGuard scope)
    : IRequestHandler<GetHolidayByIdQuery, HolidayDto>
{
    public async Task<HolidayDto> Handle(GetHolidayByIdQuery request, CancellationToken ct)
    {
        var holiday = await db.Holidays
            .Include(h => h.Company)
            .FirstOrDefaultAsync(h => h.Id == request.Id, ct)
            ?? throw new KeyNotFoundException($"ไม่พบ Holiday Id '{request.Id}'");

        if (holiday.CompanyId.HasValue)
            await scope.ThrowIfCannotAccessAsync(holiday.CompanyId.Value, ct);

        return CreateHolidayHandler.ToDto(holiday);
    }
}
