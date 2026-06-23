using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.Employees.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Employees.GetEmployees;

public record GetEmployeesQuery(
    int Page,
    int PageSize,
    string? Search,
    Guid? CompanyId,
    bool? IsActive = true) : IRequest<PagedResult<EmployeeListItemDto>>;

public class GetEmployeesHandler(IApplicationDbContext db, IScopeGuard scope)
    : IRequestHandler<GetEmployeesQuery, PagedResult<EmployeeListItemDto>>
{
    public async Task<PagedResult<EmployeeListItemDto>> Handle(GetEmployeesQuery request, CancellationToken ct)
    {
        var accessibleIds = await scope.GetAccessibleCompanyIdsAsync(ct);

        // ถ้า companyId ระบุมา ตรวจสิทธิ์ก่อน
        if (request.CompanyId.HasValue &&
            accessibleIds != null && !accessibleIds.Contains(request.CompanyId.Value))
            throw new Hrms.Application.Common.Exceptions.AppForbiddenException("ไม่มีสิทธิ์เข้าถึงบริษัทนี้");

        var query = db.Employees
            .Include(e => e.Company)
            .Include(e => e.Department)
            .Include(e => e.Roles)
            .Include(e => e.RoleLabel)
            .AsQueryable();

        if (request.IsActive.HasValue)
            query = query.Where(e => e.IsActive == request.IsActive.Value);

        if (request.CompanyId.HasValue)
            query = query.Where(e => e.CompanyId == request.CompanyId.Value);
        else if (accessibleIds != null)
            query = query.Where(e => accessibleIds.Contains(e.CompanyId));

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var s = request.Search.Trim().ToLower();
            query = query.Where(e =>
                e.EmployeeCode.ToLower().Contains(s) ||
                e.FirstName.ToLower().Contains(s) ||
                e.LastName.ToLower().Contains(s));
        }

        var totalCount = await query.CountAsync(ct);
        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 1, 100);

        var employees = await query
            .OrderBy(e => e.EmployeeCode)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var items = employees.Select(e => new EmployeeListItemDto(
            e.Id,
            e.EmployeeCode,
            $"{e.FirstName} {e.LastName}".Trim(),
            e.CompanyId,
            e.Company.Name,
            e.DepartmentId,
            e.Department?.Name,
            e.Roles.Where(r => r.IsActive).Select(r => r.Role.ToString()).ToList(),
            e.RoleLabelId,
            e.RoleLabel?.Name,
            e.IsActive)).ToList();

        return new PagedResult<EmployeeListItemDto>(items, totalCount, page, pageSize);
    }
}
