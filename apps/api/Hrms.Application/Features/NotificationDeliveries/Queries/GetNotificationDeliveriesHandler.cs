using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.NotificationDeliveries.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.NotificationDeliveries.Queries;

public class GetNotificationDeliveriesHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissions)
    : IRequestHandler<GetNotificationDeliveriesQuery, PagedResult<NotificationDeliveryDto>>
{
    public async Task<PagedResult<NotificationDeliveryDto>> Handle(
        GetNotificationDeliveriesQuery request,
        CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(
            permissions, "system:manage-notifications", ct);

        var query = db.NotificationOutboxes.AsNoTracking();
        if (request.Status.HasValue)
            query = query.Where(x => x.Status == request.Status);
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim();
            query = query.Where(x =>
                (x.EntityReference != null && x.EntityReference.Contains(search)) ||
                x.EventType.Contains(search) ||
                (x.RecipientEmployee != null &&
                    (x.RecipientEmployee.FirstName.Contains(search) ||
                     x.RecipientEmployee.LastName.Contains(search))));
        }

        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 1, 100);
        var totalCount = await query.CountAsync(ct);
        var items = await query.OrderByDescending(x => x.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new NotificationDeliveryDto(
                x.Id,
                x.Channel,
                x.EventType,
                x.EntityType,
                x.EntityId,
                x.EntityReference,
                x.RecipientEmployeeId,
                x.RecipientEmployee == null
                    ? "ไม่พบข้อมูลพนักงาน"
                    : (x.RecipientEmployee.FirstName + " " + x.RecipientEmployee.LastName).Trim(),
                x.Status,
                x.AttemptCount,
                x.NextAttemptAt,
                x.LastError,
                x.SentAt,
                x.CreatedAt))
            .ToListAsync(ct);

        return new PagedResult<NotificationDeliveryDto>(
            items, totalCount, page, pageSize);
    }
}
