using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Holidays.Commands;
using Hrms.Application.Features.Holidays.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Holidays.Queries;

/// <param name="Year">กรองปี (ค.ศ.) — required</param>
/// <param name="CompanyId">null = ดูทั้ง national + company ที่เข้าถึงได้, ระบุ = กรองเฉพาะ company นั้น + national</param>
public record GetHolidaysQuery(
    int Year,
    Guid? CompanyId = null,
    bool IncludeInactive = false) : IRequest<IReadOnlyList<HolidayDto>>;

public class GetHolidaysHandler(IApplicationDbContext db, IScopeGuard scope)
    : IRequestHandler<GetHolidaysQuery, IReadOnlyList<HolidayDto>>
{
    public async Task<IReadOnlyList<HolidayDto>> Handle(GetHolidaysQuery request, CancellationToken ct)
    {
        var query = db.Holidays
            .Include(h => h.Company)
            .Where(h => h.Date.Year == request.Year)
            .AsQueryable();

        if (!request.IncludeInactive)
            query = query.Where(h => h.IsActive);

        var accessibleIds = await scope.GetAccessibleCompanyIdsAsync(ct);

        if (request.CompanyId.HasValue)
        {
            // ตรวจสิทธิ์ถ้าระบุ company — แต่ทุก role ดู national ได้เสมอ
            if (accessibleIds != null && !accessibleIds.Contains(request.CompanyId.Value))
                throw new AppForbiddenException("ไม่มีสิทธิ์เข้าถึงวันหยุดของ company นี้");

            query = query.Where(h => h.CompanyId == null || h.CompanyId == request.CompanyId.Value);
        }
        else if (accessibleIds != null)
        {
            // HR/Employee → national + company ที่เข้าถึงได้
            query = query.Where(h => h.CompanyId == null || accessibleIds.Contains(h.CompanyId!.Value));
        }
        else
        {
            // accessibleIds == null → Admin/HQ-HR → เห็นทั้งหมด (ไม่กรอง)
        }

        var list = await query
            .OrderBy(h => h.Date)
            .ThenBy(h => h.CompanyId == null ? 0 : 1)
            .ToListAsync(ct);

        return list.Select(CreateHolidayHandler.ToDto).ToList();
    }
}
