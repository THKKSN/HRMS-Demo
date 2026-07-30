using Hrms.Application.Common.Models;
using Hrms.Application.Features.NotificationDeliveries.Dtos;
using Hrms.Domain.Enums;
using MediatR;

namespace Hrms.Application.Features.NotificationDeliveries.Queries;

public record GetNotificationDeliveriesQuery(
    NotificationDeliveryStatus? Status,
    string? Search,
    int Page = 1,
    int PageSize = 20) : IRequest<PagedResult<NotificationDeliveryDto>>;
