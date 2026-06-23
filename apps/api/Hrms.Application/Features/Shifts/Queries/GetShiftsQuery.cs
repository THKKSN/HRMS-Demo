using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Shifts.Commands;
using Hrms.Application.Features.Shifts.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Shifts.Queries;

public record GetShiftsQuery(
    Guid? CompanyId,
    bool IncludeInactive = false) : IRequest<IReadOnlyList<ShiftDto>>;

public class GetShiftsHandler(IApplicationDbContext db, IScopeGuard scope)
    : IRequestHandler<GetShiftsQuery, IReadOnlyList<ShiftDto>>
{
    public async Task<IReadOnlyList<ShiftDto>> Handle(GetShiftsQuery request, CancellationToken ct)
    {
        var accessibleIds = await scope.GetAccessibleCompanyIdsAsync(ct);

        if (request.CompanyId.HasValue && accessibleIds != null && !accessibleIds.Contains(request.CompanyId.Value))
            throw new AppForbiddenException("ไม่มีสิทธิ์เข้าถึง Shift ของ company นี้");

        var query = db.Shifts
            .Include(s => s.Company)
            .AsQueryable();

        if (!request.IncludeInactive)
            query = query.Where(s => s.IsActive);

        if (request.CompanyId.HasValue)
            query = query.Where(s => s.CompanyId == request.CompanyId.Value);
        else if (accessibleIds != null)
            query = query.Where(s => accessibleIds.Contains(s.CompanyId));

        var list = await query
            .OrderBy(s => s.Company.Name)
            .ThenBy(s => s.StartTime)
            .ToListAsync(ct);

        return list.Select(CreateShiftHandler.ToDto).ToList();
    }
}
