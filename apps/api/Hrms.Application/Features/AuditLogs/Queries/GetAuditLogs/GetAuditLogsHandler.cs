using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.AuditLogs.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.AuditLogs.Queries.GetAuditLogs;

public class GetAuditLogsHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permService)
    : IRequestHandler<GetAuditLogsQuery, PagedResult<AuditLogDto>>
{
    public async Task<PagedResult<AuditLogDto>> Handle(GetAuditLogsQuery request, CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permService, "system:view-audit-logs", ct);

        var query = db.AuditLogs.AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Module))
            query = query.Where(l => l.Module == request.Module);

        if (!string.IsNullOrWhiteSpace(request.EntityType))
            query = query.Where(l => l.EntityType == request.EntityType);

        if (!string.IsNullOrWhiteSpace(request.EntityId))
            query = query.Where(l => l.EntityId == request.EntityId);

        if (!string.IsNullOrWhiteSpace(request.Action))
            query = query.Where(l => l.Action == request.Action);

        if (request.PerformedByEmployeeId.HasValue)
            query = query.Where(l => l.PerformedByEmployeeId == request.PerformedByEmployeeId.Value);

        if (request.DateFrom.HasValue)
            query = query.Where(l => l.CreatedAt >= request.DateFrom.Value);

        if (request.DateTo.HasValue)
            query = query.Where(l => l.CreatedAt <= request.DateTo.Value);

        var totalCount = await query.CountAsync(ct);

        var page     = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 1, 100);

        var items = await query
            .OrderByDescending(l => l.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(l => new AuditLogDto(
                l.Id,
                l.Module,
                l.EntityType,
                l.EntityId,
                l.Action,
                l.Description,
                l.OldValues,
                l.NewValues,
                l.PerformedByEmployeeId,
                l.PerformedByName,
                l.CreatedAt))
            .ToListAsync(ct);

        return new PagedResult<AuditLogDto>(items, totalCount, page, pageSize);
    }
}
