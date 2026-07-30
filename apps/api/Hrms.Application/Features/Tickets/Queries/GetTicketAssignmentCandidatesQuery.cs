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
    public async Task<IReadOnlyList<TicketAssignmentCandidateDto>> Handle(
        GetTicketAssignmentCandidatesQuery request, CancellationToken ct)
    {
        var ticket = await db.Tickets.AsNoTracking().FirstOrDefaultAsync(t => t.Id == request.TicketId, ct)
            ?? throw new KeyNotFoundException("ไม่พบใบแจ้งเรื่อง");
        await TicketSupervisorAccess.EnsureTicketAsync(
            db, currentUser, permissionService, "ticket:assign", ticket, ct);

        var routingResult = await routing.ResolveAsync(
            ticket.TargetCompanyId, ticket.TargetDepartmentId, ticket.CategoryId, ticket.TopicId,
            DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7)), ct);
        var recommendedIds = routingResult.Candidates.Select(c => c.EmployeeId).ToList();
        var level = routingResult.Level;

        var employees = await db.Employees.AsNoTracking()
            .Where(e => e.IsActive &&
                        e.CompanyId == ticket.TargetCompanyId &&
                        e.DepartmentId == ticket.TargetDepartmentId)
            .OrderBy(e => e.FirstName)
            .ThenBy(e => e.LastName)
            .Select(e => new
            {
                e.Id,
                e.EmployeeCode,
                EmployeeName = (e.FirstName + " " + e.LastName).Trim(),
                RoleLabelName = e.RoleLabel != null ? e.RoleLabel.Name : null
            })
            .ToListAsync(ct);

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
                return new TicketAssignmentCandidateDto(
                    employee.Id, employee.EmployeeCode, employee.EmployeeName, employee.RoleLabelName,
                    activeCounts.GetValueOrDefault(employee.Id), recommended,
                    recommended ? level : TicketRoutingLevel.None);
            })
            .OrderByDescending(candidate => candidate.IsRecommended)
            .ThenBy(candidate => candidate.ActiveTicketCount)
            .ThenBy(candidate => candidate.EmployeeName)
            .ToList();
    }
}
