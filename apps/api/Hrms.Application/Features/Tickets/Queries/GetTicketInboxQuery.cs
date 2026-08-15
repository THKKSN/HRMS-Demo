using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.Tickets.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Tickets.Queries;

public record GetTicketInboxQuery(
    Guid? CompanyId,
    Guid? DepartmentId,
    TicketStatus? Status,
    TicketPriority? Priority,
    Guid? CategoryId,
    Guid? TopicId,
    string? Search,
    DateOnly? DateFrom,
    DateOnly? DateTo,
    int Page = 1,
    int PageSize = 20) : IRequest<PagedResult<TicketInboxItemDto>>;

public class GetTicketInboxHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissionService)
    : IRequestHandler<GetTicketInboxQuery, PagedResult<TicketInboxItemDto>>
{
    public async Task<PagedResult<TicketInboxItemDto>> Handle(GetTicketInboxQuery request, CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permissionService, "ticket:view-team", ct);

        var query = TicketSupervisorAccess.ApplyDepartmentScope(db.Tickets.AsNoTracking(), currentUser, db);
        if (request.CompanyId.HasValue) query = query.Where(t => t.TargetCompanyId == request.CompanyId.Value);
        if (request.DepartmentId.HasValue) query = query.Where(t => t.TargetDepartmentId == request.DepartmentId.Value);
        if (request.Status.HasValue) query = query.Where(t => t.Status == request.Status.Value);
        if (request.Priority.HasValue) query = query.Where(t => t.Priority == request.Priority.Value);
        if (request.CategoryId.HasValue) query = query.Where(t => t.CategoryId == request.CategoryId.Value);
        if (request.TopicId.HasValue) query = query.Where(t => t.TopicId == request.TopicId.Value);
        if (request.DateFrom.HasValue)
        {
            var from = request.DateFrom.Value.ToDateTime(TimeOnly.MinValue);
            query = query.Where(t => t.CreatedAt >= from);
        }
        if (request.DateTo.HasValue)
        {
            var toExclusive = request.DateTo.Value.AddDays(1).ToDateTime(TimeOnly.MinValue);
            query = query.Where(t => t.CreatedAt < toExclusive);
        }
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLower();
            query = query.Where(t =>
                t.TicketNo.ToLower().Contains(search) ||
                t.Title.ToLower().Contains(search) ||
                t.RequesterEmployee.FirstName.ToLower().Contains(search) ||
                t.RequesterEmployee.LastName.ToLower().Contains(search) ||
                (t.VehicleText != null && t.VehicleText.ToLower().Contains(search)));
        }

        var totalCount = await query.CountAsync(ct);
        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 1, 100);

        var rows = await query
            .OrderByDescending(t => t.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(t => new
            {
                t.Id,
                t.TicketNo,
                t.Title,
                t.Status,
                t.Priority,
                t.RequesterEmployeeId,
                RequesterName = (t.RequesterEmployee.FirstName + " " + t.RequesterEmployee.LastName).Trim(),
                SourceDepartmentName = t.SourceDepartment != null ? t.SourceDepartment.Name : null,
                t.TargetCompanyId,
                TargetCompanyName = t.TargetCompany.Name,
                t.TargetDepartmentId,
                TargetDepartmentName = t.TargetDepartment.Name,
                t.CategoryId,
                CategoryName = t.Category.Name,
                t.TopicId,
                TopicName = t.Topic.Name,
                t.OtherTopicText,
                t.LocationText,
                t.VehicleText,
                IsAccepted = t.SupervisorAcceptedAt != null,
                t.SupervisorAcceptedAt,
                CurrentAssigneeEmployeeId = t.Assignments.Where(a => a.IsPrimary)
                    .OrderByDescending(a => a.IsActive)
                    .ThenByDescending(a => a.AssignedAt)
                    .Select(a => (Guid?)a.AssignedToEmployeeId).FirstOrDefault(),
                CurrentAssigneeName = t.Assignments.Where(a => a.IsPrimary)
                    .OrderByDescending(a => a.IsActive)
                    .ThenByDescending(a => a.AssignedAt)
                    .Select(a => (a.AssignedToEmployee.FirstName + " " + a.AssignedToEmployee.LastName).Trim())
                    .FirstOrDefault(),
                AssignedByEmployeeName = t.Assignments.Where(a => a.IsPrimary)
                    .OrderByDescending(a => a.IsActive)
                    .ThenByDescending(a => a.AssignedAt)
                    .Select(a => a.AssignedByEmployee == null ? null :
                        (a.AssignedByEmployee.FirstName + " " + a.AssignedByEmployee.LastName).Trim())
                    .FirstOrDefault(),
                AssignedAt = t.Assignments.Where(a => a.IsPrimary)
                    .OrderByDescending(a => a.IsActive)
                    .ThenByDescending(a => a.AssignedAt)
                    .Select(a => (DateTime?)a.AssignedAt)
                    .FirstOrDefault(),
                t.WorkflowBoardStepsJson,
                t.WorkflowCurrentStepKey,
                t.CurrentWorkState,
                t.CurrentBlockerReason,
                t.CurrentNextAction,
                t.CreatedAt
            })
            .ToListAsync(ct);

        var items = rows
            .Select(t =>
            {
                var currentStepLabel = TicketWorkflowRuntime.DeserializeBoardSteps(t.WorkflowBoardStepsJson)
                    .FirstOrDefault(step => step.Key == t.WorkflowCurrentStepKey)?.Label;

                return new TicketInboxItemDto(
                    t.Id,
                    t.TicketNo,
                    t.Title,
                    t.Status,
                    t.Priority,
                    t.RequesterEmployeeId,
                    t.RequesterName,
                    t.SourceDepartmentName,
                    t.TargetCompanyId,
                    t.TargetCompanyName,
                    t.TargetDepartmentId,
                    t.TargetDepartmentName,
                    t.CategoryId,
                    t.CategoryName,
                    t.TopicId,
                    t.TopicName,
                    t.OtherTopicText,
                    t.LocationText,
                    t.VehicleText,
                    t.IsAccepted,
                    t.SupervisorAcceptedAt,
                    t.CurrentAssigneeEmployeeId,
                    t.CurrentAssigneeName,
                    t.AssignedByEmployeeName,
                    t.AssignedAt,
                    t.WorkflowCurrentStepKey,
                    currentStepLabel,
                    t.CurrentWorkState,
                    t.CurrentBlockerReason,
                    t.CurrentNextAction,
                    t.CreatedAt);
            })
            .ToList();

        return new PagedResult<TicketInboxItemDto>(items, totalCount, page, pageSize);
    }
}
