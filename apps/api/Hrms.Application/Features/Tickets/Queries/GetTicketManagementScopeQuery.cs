using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Tickets.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Tickets.Queries;

public record TicketManagementScopeDto(
    IReadOnlyList<TicketLookupCompanyDto> Companies,
    IReadOnlyList<TicketLookupDepartmentDto> Departments);

public record GetTicketManagementScopeQuery : IRequest<TicketManagementScopeDto>;

public class GetTicketManagementScopeHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissionService) : IRequestHandler<GetTicketManagementScopeQuery, TicketManagementScopeDto>
{
    public async Task<TicketManagementScopeDto> Handle(GetTicketManagementScopeQuery request, CancellationToken ct)
    {
        var canManageCategories = await permissionService.HasPermissionAsync(currentUser, "ticket:manage-categories", ct);
        var canManageTopics = await permissionService.HasPermissionAsync(currentUser, "ticket:manage-topics", ct);
        if (!canManageCategories && !canManageTopics)
            throw new AppForbiddenException("ไม่มีสิทธิ์จัดการหมวดหรือหัวข้อแจ้งเรื่อง");

        var departmentsQuery = db.Departments
            .Where(d => d.IsActive && d.Company.IsActive);

        if (!currentUser.HasRole(RoleType.Admin))
        {
            var employeeId = currentUser.EmployeeId
                ?? throw new AppUnauthorizedException("UNAUTHENTICATED");
            Guid? ownDepartmentId = null;
            if (currentUser.HasRole(RoleType.Supervisor, currentUser.CompanyId))
            {
                ownDepartmentId = currentUser.DepartmentId ?? await db.Employees.AsNoTracking()
                    .Where(employee => employee.Id == employeeId && employee.IsActive)
                    .Select(employee => employee.DepartmentId)
                    .FirstOrDefaultAsync(ct);
            }
            var roleDepartmentIds = currentUser.Roles
                .Where(role => role.Role == RoleType.Supervisor.ToString() && role.DepartmentId.HasValue)
                .Select(role => role.DepartmentId!.Value)
                .ToList();
            departmentsQuery = departmentsQuery.Where(d =>
                d.ManagerEmployeeId == employeeId ||
                (ownDepartmentId.HasValue && d.Id == ownDepartmentId.Value) ||
                roleDepartmentIds.Contains(d.Id));
        }

        var departments = await departmentsQuery
            .OrderBy(d => d.Company.Name)
            .ThenBy(d => d.Name)
            .Select(d => new TicketLookupDepartmentDto(d.Id, d.CompanyId, d.Name))
            .ToListAsync(ct);

        var companyIds = departments.Select(d => d.CompanyId).Distinct().ToList();
        var companies = await db.Companies
            .Where(c => companyIds.Contains(c.Id))
            .OrderBy(c => c.Name)
            .Select(c => new TicketLookupCompanyDto(c.Id, c.Name))
            .ToListAsync(ct);

        return new TicketManagementScopeDto(companies, departments);
    }
}
