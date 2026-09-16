using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Tickets.Commands;
using Hrms.Application.Features.Tickets.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Tickets.Queries;

/// <summary>รายการสำหรับหน้าตั้งค่า: ทีมของแผนกที่เลือก + ทีมระดับบริษัทที่แผนกนี้ใช้ร่วมด้วย</summary>
public record GetManagedTicketTeamTemplatesQuery(Guid CompanyId, Guid DepartmentId)
    : IRequest<IReadOnlyList<TicketTeamTemplateDto>>;

public class GetManagedTicketTeamTemplatesHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissions)
    : IRequestHandler<GetManagedTicketTeamTemplatesQuery, IReadOnlyList<TicketTeamTemplateDto>>
{
    public async Task<IReadOnlyList<TicketTeamTemplateDto>> Handle(
        GetManagedTicketTeamTemplatesQuery request, CancellationToken ct)
    {
        await TicketManagementAccess.EnsureDepartmentAsync(
            db, currentUser, permissions, TicketTeamTemplateSupport.ManagePermission,
            request.CompanyId, request.DepartmentId, ct);

        var templates = await db.TicketTeamTemplates.AsNoTracking()
            .Include(template => template.Department)
            .Include(template => template.Members).ThenInclude(member => member.Employee)
                .ThenInclude(employee => employee.Department)
            .Where(template => template.CompanyId == request.CompanyId &&
                (template.DepartmentId == null || template.DepartmentId == request.DepartmentId))
            .OrderBy(template => template.DepartmentId == null ? 1 : 0)
            .ThenBy(template => template.SortOrder)
            .ThenBy(template => template.Name)
            .ToListAsync(ct);
        return templates.Select(TicketTeamTemplateSupport.ToDto).ToList();
    }
}

/// <summary>
/// ทีมสำเร็จรูปที่ใช้กับใบแจ้งเรื่องใบนี้ได้ — เปิดใช้งาน + บริษัทปลายทางตรงกัน
/// + (ระดับบริษัท หรือ ตรงแผนกปลายทาง) พร้อมบอกว่าจะเพิ่มคนได้จริงกี่คน
/// </summary>
public record GetTicketTeamTemplateOptionsQuery(Guid TicketId)
    : IRequest<IReadOnlyList<TicketTeamTemplateOptionDto>>;

public class GetTicketTeamTemplateOptionsHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissions)
    : IRequestHandler<GetTicketTeamTemplateOptionsQuery, IReadOnlyList<TicketTeamTemplateOptionDto>>
{
    public async Task<IReadOnlyList<TicketTeamTemplateOptionDto>> Handle(
        GetTicketTeamTemplateOptionsQuery request, CancellationToken ct)
    {
        var ticket = await db.Tickets.AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == request.TicketId, ct)
            ?? throw new NotFoundException("Ticket", request.TicketId, "TICKET_NOT_FOUND");
        await TicketAccess.EnsureCanViewAsync(db, currentUser, permissions, ticket, ct);

        var alreadyInTeam = await db.TicketAssignments.AsNoTracking()
            .Where(assignment => assignment.TicketId == ticket.Id && assignment.IsActive)
            .Select(assignment => assignment.AssignedToEmployeeId)
            .ToListAsync(ct);

        var templates = await db.TicketTeamTemplates.AsNoTracking()
            .Include(template => template.Members)
            .Where(template => template.IsActive &&
                template.CompanyId == ticket.TargetCompanyId &&
                (template.DepartmentId == null || template.DepartmentId == ticket.TargetDepartmentId))
            .OrderBy(template => template.DepartmentId == null ? 1 : 0)
            .ThenBy(template => template.SortOrder)
            .ThenBy(template => template.Name)
            .ToListAsync(ct);

        return templates
            .Select(template => new TicketTeamTemplateOptionDto(
                template.Id,
                template.Name,
                template.Description,
                template.DepartmentId == null,
                template.Members.Count,
                template.Members.Count(member =>
                    !alreadyInTeam.Contains(member.EmployeeId) &&
                    member.EmployeeId != ticket.RequesterEmployeeId)))
            .ToList();
    }
}
