using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Tickets.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Tickets.Queries;

public record GetTicketAssignmentCandidatesQuery(Guid TicketId)
    : IRequest<IReadOnlyList<TicketAssignmentCandidateDto>>;

public class GetTicketAssignmentCandidatesHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissionService,
    ITicketRoutingService routing)
    : IRequestHandler<GetTicketAssignmentCandidatesQuery, IReadOnlyList<TicketAssignmentCandidateDto>>
{
    private sealed record CandidateEmployee(
        Guid Id, string EmployeeCode, string EmployeeName, string? RoleLabelName,
        Guid? DepartmentId, string? DepartmentName);

    public async Task<IReadOnlyList<TicketAssignmentCandidateDto>> Handle(
        GetTicketAssignmentCandidatesQuery request, CancellationToken ct)
    {
        var ticket = await db.Tickets.AsNoTracking().FirstOrDefaultAsync(t => t.Id == request.TicketId, ct)
            ?? throw new KeyNotFoundException("ไม่พบใบแจ้งเรื่อง");
        await TicketSupervisorAccess.EnsureTicketAsync(
            db, currentUser, permissionService, "ticket:assign", ticket, ct);

        List<CandidateEmployee> employees;
        List<Guid> recommendedIds;
        var level = TicketRoutingLevel.None;

        if (ticket.RequestType == TicketRequestType.External)
        {
            // External ticket ไม่ auto-route/ไม่ผูกแผนก — Supervisor เลือกจากพนักงาน active ทุกคนของบริษัทที่ fix ไว้ ไม่มี recommendation
            recommendedIds = [];
            employees = await db.Employees.AsNoTracking()
                .Where(e => e.IsActive && e.CompanyId == ticket.TargetCompanyId)
                .OrderBy(e => e.FirstName)
                .ThenBy(e => e.LastName)
                .Select(e => new CandidateEmployee(
                    e.Id,
                    e.EmployeeCode,
                    (e.FirstName + " " + e.LastName).Trim(),
                    e.RoleLabel != null ? e.RoleLabel.Name : null,
                    e.DepartmentId,
                    e.Department != null ? e.Department.Name : null))
                .ToListAsync(ct);
        }
        else
        {
            var routingResult = await routing.ResolveAsync(
                ticket.TargetCompanyId, ticket.TargetDepartmentId!.Value, ticket.CategoryId!.Value, ticket.TopicId!.Value,
                DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7)), ct);
            recommendedIds = routingResult.Candidates.Select(c => c.EmployeeId).ToList();
            level = routingResult.Level;

            // Supervisor/Admin ของบริษัทปลายทางจ่ายงานข้ามแผนกได้ (งานยังเป็นของแผนกปลายทาง)
            // — เห็น candidate ทุกแผนกในบริษัท; role อื่นเห็นเฉพาะแผนกปลายทาง
            var canAssignAcrossDepartment =
                currentUser.HasRole(RoleType.Admin) ||
                currentUser.HasRole(RoleType.Supervisor, ticket.TargetCompanyId);

            employees = await db.Employees.AsNoTracking()
                .Where(e => e.IsActive &&
                            e.CompanyId == ticket.TargetCompanyId &&
                            (canAssignAcrossDepartment || e.DepartmentId == ticket.TargetDepartmentId))
                .OrderBy(e => e.FirstName)
                .ThenBy(e => e.LastName)
                .Select(e => new CandidateEmployee(
                    e.Id,
                    e.EmployeeCode,
                    (e.FirstName + " " + e.LastName).Trim(),
                    e.RoleLabel != null ? e.RoleLabel.Name : null,
                    e.DepartmentId,
                    e.Department != null ? e.Department.Name : null))
                .ToListAsync(ct);
        }

        var employeeIds = employees.Select(e => e.Id).ToList();
        var activeCounts = await db.TicketAssignments.AsNoTracking()
            .Where(a => employeeIds.Contains(a.AssignedToEmployeeId) && a.IsActive &&
                        a.Ticket.Status != TicketStatus.Closed &&
                        a.Ticket.Status != TicketStatus.Rejected &&
                        a.Ticket.Status != TicketStatus.Cancelled)
            .GroupBy(a => a.AssignedToEmployeeId)
            .Select(group => new { EmployeeId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.EmployeeId, item => item.Count, ct);

        return employees
            .Select(employee =>
            {
                var recommended = recommendedIds.Contains(employee.Id);
                // ticket ที่ไม่ผูกแผนก (external) ถือว่าทุกคนอยู่ในขอบเขตปลายทาง
                var inTargetDepartment = !ticket.TargetDepartmentId.HasValue ||
                    employee.DepartmentId == ticket.TargetDepartmentId;
                return new TicketAssignmentCandidateDto(
                    employee.Id, employee.EmployeeCode, employee.EmployeeName, employee.RoleLabelName,
                    activeCounts.GetValueOrDefault(employee.Id), recommended,
                    recommended ? level : TicketRoutingLevel.None,
                    employee.DepartmentName, inTargetDepartment);
            })
            .OrderByDescending(candidate => candidate.IsRecommended)
            .ThenByDescending(candidate => candidate.IsInTargetDepartment)
            .ThenBy(candidate => candidate.ActiveTicketCount)
            .ThenBy(candidate => candidate.EmployeeName)
            .ToList();
    }
}
