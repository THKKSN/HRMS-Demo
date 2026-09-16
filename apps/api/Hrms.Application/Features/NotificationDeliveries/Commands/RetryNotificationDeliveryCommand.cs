using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.NotificationDeliveries.Commands;

public record RetryNotificationDeliveryCommand(Guid Id) : IRequest;

public class RetryNotificationDeliveryHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissions)
    : IRequestHandler<RetryNotificationDeliveryCommand>
{
    public async Task Handle(RetryNotificationDeliveryCommand request, CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(
            permissions, "system:manage-notifications", ct);
        var delivery = await db.NotificationOutboxes
            .FirstOrDefaultAsync(x => x.Id == request.Id, ct)
            ?? throw new NotFoundException("NotificationDelivery", request.Id, "NOTIFICATION_NOT_FOUND");
        if (delivery.Status is not (
            NotificationDeliveryStatus.Failed or NotificationDeliveryStatus.DeadLetter))
            throw new ConflictException(
                "NOTIFICATION_NOT_RETRYABLE",
                "Only failed or dead-letter notifications can be retried.");

        delivery.Status = NotificationDeliveryStatus.Pending;
        delivery.AttemptCount = 0;
        delivery.NextAttemptAt = DateTime.UtcNow.AddHours(7);
        delivery.ProcessingStartedAt = null;
        delivery.LastError = null;
        delivery.SentAt = null;
        delivery.UpdatedBy = currentUser.EmployeeId;
        await db.SaveChangesAsync(ct);
    }
}
