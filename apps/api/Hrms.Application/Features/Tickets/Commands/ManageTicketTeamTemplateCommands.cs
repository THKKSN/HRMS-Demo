using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Tickets.Dtos;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Tickets.Commands;

public record CreateTicketTeamTemplateCommand(
    Guid CompanyId,
    Guid? DepartmentId,
    string Name,
    string? Description,
    int SortOrder,
    IReadOnlyList<Guid> EmployeeIds) : IRequest<TicketTeamTemplateDto>;

public record UpdateTicketTeamTemplateCommand(
    Guid Id,
    string Name,
    string? Description,
    int SortOrder,
    bool IsActive,
    IReadOnlyList<Guid> EmployeeIds) : IRequest<TicketTeamTemplateDto>;

public class CreateTicketTeamTemplateValidator : AbstractValidator<CreateTicketTeamTemplateCommand>
{
    public CreateTicketTeamTemplateValidator()
    {
        RuleFor(x => x.CompanyId).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Description).MaximumLength(500);
        RuleFor(x => x.EmployeeIds).NotEmpty().WithErrorCode("TICKET_TEAM_TEMPLATE_MEMBER_REQUIRED").WithMessage("A team template must have at least one member.");
    }
}

public class UpdateTicketTeamTemplateValidator : AbstractValidator<UpdateTicketTeamTemplateCommand>
{
    public UpdateTicketTeamTemplateValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Description).MaximumLength(500);
        RuleFor(x => x.EmployeeIds).NotEmpty().WithErrorCode("TICKET_TEAM_TEMPLATE_MEMBER_REQUIRED").WithMessage("A team template must have at least one member.");
    }
}

/// <summary>
/// กติกาของ template — สมาชิกต้องอยู่บริษัทเดียวกับ template และห้ามชื่อซ้ำใน scope เดียวกัน
/// template เป็นแค่รายการอ้างอิง ไม่ให้สิทธิ์ใด ๆ ด้วยตัวเอง
/// </summary>
internal static class TicketTeamTemplateSupport
{
    public const string ManagePermission = "ticket:manage-team-templates";

    public static TicketTeamTemplateDto ToDto(TicketTeamTemplate template)
        => new(
            template.Id,
            template.CompanyId,
            template.DepartmentId,
            template.Department?.Name,
            template.Name,
            template.Description,
            template.IsActive,
            template.SortOrder,
            template.Members
                .OrderBy(member => member.Employee.FirstName)
                .Select(member => new TicketTeamTemplateMemberDto(
                    member.EmployeeId,
                    $"{member.Employee.FirstName} {member.Employee.LastName}".Trim(),
                    member.Employee.EmployeeCode,
                    member.Employee.Department != null ? member.Employee.Department.Name : null,
                    member.Employee.IsActive))
                .ToList());

    public static async Task EnsureNameAvailableAsync(
        IApplicationDbContext db,
        Guid companyId,
        Guid? departmentId,
        string name,
        Guid? excludeId,
        CancellationToken ct)
    {
        var duplicated = await db.TicketTeamTemplates.AnyAsync(template =>
            template.CompanyId == companyId &&
            template.DepartmentId == departmentId &&
            template.Name == name &&
            (!excludeId.HasValue || template.Id != excludeId.Value), ct);
        if (duplicated)
            throw new ConflictException("TEAM_TEMPLATE_DUPLICATED", "A team template with this name already exists in the same scope.");
    }

    public static async Task<List<Guid>> ValidateMembersAsync(
        IApplicationDbContext db,
        Guid companyId,
        IReadOnlyList<Guid> employeeIds,
        CancellationToken ct)
    {
        var ids = employeeIds.Distinct().ToList();
        var found = await db.Employees.AsNoTracking()
            .Where(employee => ids.Contains(employee.Id) && employee.IsActive && employee.CompanyId == companyId)
            .Select(employee => employee.Id)
            .ToListAsync(ct);
        if (found.Count != ids.Count)
            throw new BadRequestException("TICKET_TEAM_TEMPLATE_MEMBER_INVALID", "Team members must be active employees of the same company as the template.");
        return ids;
    }
}

public class CreateTicketTeamTemplateHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissions,
    IAuditLogService auditLog)
    : IRequestHandler<CreateTicketTeamTemplateCommand, TicketTeamTemplateDto>
{
    public async Task<TicketTeamTemplateDto> Handle(
        CreateTicketTeamTemplateCommand request, CancellationToken ct)
    {
        if (request.DepartmentId.HasValue)
        {
            await TicketManagementAccess.EnsureDepartmentAsync(
                db, currentUser, permissions, TicketTeamTemplateSupport.ManagePermission,
                request.CompanyId, request.DepartmentId.Value, ct);
        }
        else
        {
            await TicketManagementAccess.EnsureCompanyAsync(
                db, currentUser, permissions, TicketTeamTemplateSupport.ManagePermission, request.CompanyId, ct);
        }

        var name = request.Name.Trim();
        await TicketTeamTemplateSupport.EnsureNameAvailableAsync(
            db, request.CompanyId, request.DepartmentId, name, null, ct);
        var memberIds = await TicketTeamTemplateSupport.ValidateMembersAsync(
            db, request.CompanyId, request.EmployeeIds, ct);

        var actorId = currentUser.EmployeeId;
        var template = new TicketTeamTemplate
        {
            CompanyId = request.CompanyId,
            DepartmentId = request.DepartmentId,
            Name = name,
            Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            IsActive = true,
            SortOrder = request.SortOrder,
            CreatedByEmployeeId = actorId,
            CreatedBy = actorId,
            UpdatedBy = actorId
        };
        foreach (var employeeId in memberIds)
        {
            template.Members.Add(new TicketTeamTemplateMember
            {
                TemplateId = template.Id,
                EmployeeId = employeeId,
                CreatedBy = actorId,
                UpdatedBy = actorId
            });
        }
        db.TicketTeamTemplates.Add(template);
        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            "ticket-taxonomy", "TicketTeamTemplate", template.Id.ToString(), "create",
            $"สร้างทีมสำเร็จรูป {template.Name} ({memberIds.Count} คน)",
            null, new { template.Name, template.DepartmentId, MemberIds = memberIds }, ct);

        return await LoadDtoAsync(db, template.Id, ct);
    }

    internal static async Task<TicketTeamTemplateDto> LoadDtoAsync(
        IApplicationDbContext db, Guid id, CancellationToken ct)
    {
        var saved = await db.TicketTeamTemplates.AsNoTracking()
            .Include(template => template.Department)
            .Include(template => template.Members).ThenInclude(member => member.Employee)
                .ThenInclude(employee => employee.Department)
            .FirstAsync(template => template.Id == id, ct);
        return TicketTeamTemplateSupport.ToDto(saved);
    }
}

public class UpdateTicketTeamTemplateHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissions,
    IAuditLogService auditLog)
    : IRequestHandler<UpdateTicketTeamTemplateCommand, TicketTeamTemplateDto>
{
    public async Task<TicketTeamTemplateDto> Handle(
        UpdateTicketTeamTemplateCommand request, CancellationToken ct)
    {
        var template = await db.TicketTeamTemplates
            .Include(item => item.Members)
            .FirstOrDefaultAsync(item => item.Id == request.Id, ct)
            ?? throw new NotFoundException("TicketTeamTemplate", request.Id, "TICKET_TEAM_TEMPLATE_NOT_FOUND");
        if (template.DepartmentId.HasValue)
        {
            await TicketManagementAccess.EnsureDepartmentAsync(
                db, currentUser, permissions, TicketTeamTemplateSupport.ManagePermission,
                template.CompanyId, template.DepartmentId.Value, ct);
        }
        else
        {
            await TicketManagementAccess.EnsureCompanyAsync(
                db, currentUser, permissions, TicketTeamTemplateSupport.ManagePermission, template.CompanyId, ct);
        }

        var name = request.Name.Trim();
        await TicketTeamTemplateSupport.EnsureNameAvailableAsync(
            db, template.CompanyId, template.DepartmentId, name, template.Id, ct);
        var memberIds = await TicketTeamTemplateSupport.ValidateMembersAsync(
            db, template.CompanyId, request.EmployeeIds, ct);

        var actorId = currentUser.EmployeeId;
        var before = new { template.Name, template.IsActive, MemberIds = template.Members.Select(m => m.EmployeeId).ToList() };
        template.Name = name;
        template.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        template.SortOrder = request.SortOrder;
        template.IsActive = request.IsActive;
        template.UpdatedBy = actorId;

        // สมาชิก template เป็นรายการอ้างอิง ไม่ใช่ประวัติการทำงาน จึงลบแถวที่ไม่ได้เลือกออกได้จริง
        foreach (var removed in template.Members.Where(member => !memberIds.Contains(member.EmployeeId)).ToList())
            db.TicketTeamTemplateMembers.Remove(removed);
        var currentIds = template.Members.Select(member => member.EmployeeId).ToHashSet();
        foreach (var employeeId in memberIds.Where(id => !currentIds.Contains(id)))
        {
            db.TicketTeamTemplateMembers.Add(new TicketTeamTemplateMember
            {
                TemplateId = template.Id,
                EmployeeId = employeeId,
                CreatedBy = actorId,
                UpdatedBy = actorId
            });
        }
        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            "ticket-taxonomy", "TicketTeamTemplate", template.Id.ToString(), "update",
            $"แก้ไขทีมสำเร็จรูป {template.Name} ({memberIds.Count} คน)",
            before, new { template.Name, template.IsActive, MemberIds = memberIds }, ct);

        return await CreateTicketTeamTemplateHandler.LoadDtoAsync(db, template.Id, ct);
    }
}

/// <summary>ดึงทีมสำเร็จรูปเข้าใบแจ้งเรื่อง — ตัดคนที่อยู่ในทีมแล้ว/ผู้แจ้ง/ผู้รับผิดชอบหลักออกให้</summary>
public record ApplyTicketTeamTemplateCommand(
    Guid TicketId,
    Guid TemplateId,
    DateTime? ExpectedUpdatedAt) : IRequest<TicketActionResultDto>;

public class ApplyTicketTeamTemplateHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissions,
    IMediator mediator)
    : IRequestHandler<ApplyTicketTeamTemplateCommand, TicketActionResultDto>
{
    public async Task<TicketActionResultDto> Handle(
        ApplyTicketTeamTemplateCommand request, CancellationToken ct)
    {
        var ticket = await db.Tickets.AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == request.TicketId, ct)
            ?? throw new NotFoundException("Ticket", request.TicketId, "TICKET_NOT_FOUND");
        await TicketTeamAccess.EnsureCanManageAsync(db, currentUser, permissions, ticket, ct);

        var template = await db.TicketTeamTemplates.AsNoTracking()
            .Include(item => item.Members)
            .FirstOrDefaultAsync(item =>
                item.Id == request.TemplateId &&
                item.IsActive &&
                item.CompanyId == ticket.TargetCompanyId &&
                (item.DepartmentId == null || item.DepartmentId == ticket.TargetDepartmentId), ct)
            ?? throw new BadRequestException("TICKET_TEAM_TEMPLATE_SCOPE_MISMATCH", "This team template cannot be used with this ticket.");

        var existing = await db.TicketAssignments.AsNoTracking()
            .Where(assignment => assignment.TicketId == ticket.Id && assignment.IsActive)
            .Select(assignment => assignment.AssignedToEmployeeId)
            .ToListAsync(ct);
        var candidates = template.Members
            .Select(member => member.EmployeeId)
            .Where(employeeId =>
                !existing.Contains(employeeId) && employeeId != ticket.RequesterEmployeeId)
            .ToList();
        if (candidates.Count == 0)
            throw new ConflictException(
                "TEAM_TEMPLATE_EMPTY", "Everyone in this team template is already on the ticket team.");

        // ใช้ command เดิมเพื่อให้กติกาเพดาน/บริษัท/notification เดินทางเดียวกันทั้งหมด
        return await mediator.Send(
            new AddTicketTeamMembersCommand(
                ticket.Id, candidates, $"ดึงจากทีม {template.Name}", request.ExpectedUpdatedAt),
            ct);
    }
}
