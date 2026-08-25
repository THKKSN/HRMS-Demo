using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.Employees.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Employees.GetEmployees;

public record GetEmployeesQuery(
    int Page,
    int PageSize,
    string? Search,
    Guid? CompanyId,
    bool? IsActive = true,
    Guid? DepartmentId = null,
    Guid? RoleLabelId = null,
    RoleType? Role = null) : IRequest<PagedResult<EmployeeListItemDto>>;

public class GetEmployeesHandler(IApplicationDbContext db, IScopeGuard scope, ICurrentUser currentUser, IPermissionService permService)
    : IRequestHandler<GetEmployeesQuery, PagedResult<EmployeeListItemDto>>
{
    public async Task<PagedResult<EmployeeListItemDto>> Handle(GetEmployeesQuery request, CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permService, "employee:view", ct);

        var accessibleIds = await scope.GetAccessibleCompanyIdsAsync(ct);

        // ถ้า companyId ระบุมา ตรวจสิทธิ์ก่อน
        if (request.CompanyId.HasValue &&
            accessibleIds != null && !accessibleIds.Contains(request.CompanyId.Value))
            throw new AppForbiddenException("ไม่มีสิทธิ์เข้าถึงบริษัทนี้");

        var query = db.Employees
            .Include(e => e.Company)
            .Include(e => e.Department)
            .Include(e => e.Roles).ThenInclude(r => r.Role)
            .Include(e => e.RoleLabel)
            .AsQueryable();

        if (request.IsActive.HasValue)
            query = query.Where(e => e.IsActive == request.IsActive.Value);

        if (request.CompanyId.HasValue)
            query = query.Where(e => e.CompanyId == request.CompanyId.Value);
        else if (accessibleIds != null)
            query = query.Where(e => accessibleIds.Contains(e.CompanyId));

        if (request.DepartmentId.HasValue)
            query = query.Where(e => e.DepartmentId == request.DepartmentId.Value);

        if (request.RoleLabelId.HasValue)
            query = query.Where(e => e.RoleLabelId == request.RoleLabelId.Value);

        if (request.Role.HasValue)
        {
            var role = request.Role.Value;
            query = query.Where(e => e.Roles.Any(r => r.IsActive && r.Role.Code == role));
        }

        // ค้นหาแบบหลายคำ: ทุกคำต้อง match อย่างน้อย 1 ฟิลด์ (เช่น "สมชาย IT")
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var terms = request.Search
                .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(t => t.ToLower())
                .Take(5);

            foreach (var term in terms)
            {
                var t = term;
                query = query.Where(e =>
                    e.EmployeeCode.ToLower().Contains(t) ||
                    e.FirstName.ToLower().Contains(t) ||
                    e.LastName.ToLower().Contains(t) ||
                    (e.FirstName + " " + e.LastName).ToLower().Contains(t) ||
                    (e.Email != null && e.Email.ToLower().Contains(t)) ||
                    (e.Phone != null && e.Phone.Contains(t)));
            }
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
            e.Nickname,
            e.CompanyId,
            e.Company.Name,
            e.DepartmentId,
            e.Department?.Name,
            e.Roles.Where(r => r.IsActive).Select(r => r.Role.Code.ToString()).ToList(),
            e.RoleLabelId,
            e.RoleLabel?.Name,
            e.IsActive)).ToList();

        return new PagedResult<EmployeeListItemDto>(items, totalCount, page, pageSize);
    }
}
