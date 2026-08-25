using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Constants;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.ExternalTickets;

internal static class ExternalTicketConfigAccess
{
    private const string ManagePermission = "ticket:manage-external-config";

    public static Task EnsureManagePermissionAsync(
        ICurrentUser currentUser, IPermissionService permissionService, CancellationToken ct)
        => currentUser.ThrowIfNoPermissionAsync(permissionService, ManagePermission, ct);

    public static async Task<ExternalTicketConfiguration> LoadConfigurationAsync(
        IApplicationDbContext db, CancellationToken ct)
    {
        return await db.ExternalTicketConfigurations
            .FirstOrDefaultAsync(c => c.TargetCompanyId == ExternalTicketConstants.TargetCompanyId, ct)
            ?? throw new InvalidOperationException("EXTERNAL_TICKET_CONFIGURATION_MISSING");
    }
}
