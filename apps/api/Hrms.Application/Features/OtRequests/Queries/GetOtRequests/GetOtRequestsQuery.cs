using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.OtRequests.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.OtRequests.Queries.GetOtRequests;

/// <param name="MyOnly">true = เฉพาะของตัวเอง, false = ทั้งหมดใน scope</param>
/// <param name="TeamOnly">true = เฉพาะทีมที่ต้องอนุมัติ (Supervisor view)</param>
public record GetOtRequestsQuery(
    bool MyOnly = false,
    bool TeamOnly = false,
    OtStatus? Status = null,
    Guid? CompanyId = null,
    int? Year = null,
    int? Month = null,
    int Page = 1,
    int PageSize = 50) : IRequest<PagedResult<OtRequestDto>>;

public class GetOtRequestsHandler(IApplicationDbContext db, ICurrentUser currentUser, IScopeGuard scope)
    : IRequestHandler<GetOtRequestsQuery, PagedResult<OtRequestDto>>
{
    public async Task<PagedResult<OtRequestDto>> Handle(GetOtRequestsQuery request, CancellationToken ct)
    {
        var employeeId = currentUser.EmployeeId
            ?? throw new UnauthorizedAccessException();

        var query = db.OtRequests
            .Include(o => o.Employee).ThenInclude(e => e.Department)
            .AsQueryable();

        if (request.MyOnly)
        {
            // พนักงานดูของตัวเอง
            query = query.Where(o => o.EmployeeId == employeeId);
        }
        else if (request.TeamOnly)
        {
            // Supervisor ดูทีมที่ต้องอนุมัติ
            query = query.Where(o => o.SupervisorId == employeeId || o.Status == OtStatus.PendingSupervisor);
        }
        else
        {
            // HR/Admin ดูทั้งหมดใน scope (รองรับ HQ HR)
            var accessibleIds = await scope.GetAccessibleCompanyIdsAsync(ct);
            if (request.CompanyId.HasValue)
            {
                if (accessibleIds != null && !accessibleIds.Contains(request.CompanyId.Value))
                    throw new UnauthorizedAccessException("ไม่มีสิทธิ์เข้าถึงข้อมูลบริษัทนี้");
                query = query.Where(o => o.Employee.CompanyId == request.CompanyId.Value);
            }
            else if (accessibleIds != null)
            {
                query = query.Where(o => accessibleIds.Contains(o.Employee.CompanyId));
            }
            // accessibleIds == null → HQ HR/Admin → เห็นทุกบริษัท
        }

        if (request.Status.HasValue)
            query = query.Where(o => o.Status == request.Status.Value);

        if (request.Year.HasValue)
            query = query.Where(o => o.Date.Year == request.Year.Value);

        if (request.Month.HasValue)
            query = query.Where(o => o.Date.Month == request.Month.Value);

        var total = await query.CountAsync(ct);
        var page  = Math.Max(1, request.Page);
        var size  = Math.Clamp(request.PageSize, 1, 200);

        var items = await query
            .OrderByDescending(o => o.Date)
            .ThenByDescending(o => o.CreatedAt)
            .Skip((page - 1) * size)
            .Take(size)
            .ToListAsync(ct);

        var supervisorIds = items.Where(o => o.SupervisorId.HasValue).Select(o => o.SupervisorId!.Value).Distinct().ToList();
        var hrIds         = items.Where(o => o.HrId.HasValue).Select(o => o.HrId!.Value).Distinct().ToList();

        var allIds = supervisorIds.Union(hrIds).ToList();
        var nameMap = allIds.Count == 0 ? new Dictionary<Guid, string>()
            : await db.Employees
                .Where(e => allIds.Contains(e.Id))
                .ToDictionaryAsync(e => e.Id, e => $"{e.FirstName} {e.LastName}".Trim(), ct);

        var dtos = items.Select(o => OtRequestMapper.ToDto(
            o,
            o.Employee.Department?.Name,
            o.SupervisorId.HasValue && nameMap.TryGetValue(o.SupervisorId.Value, out var sn) ? sn : null,
            o.HrId.HasValue && nameMap.TryGetValue(o.HrId.Value, out var hn) ? hn : null
        )).ToList();

        return new PagedResult<OtRequestDto>(dtos, total, page, size);
    }
}
