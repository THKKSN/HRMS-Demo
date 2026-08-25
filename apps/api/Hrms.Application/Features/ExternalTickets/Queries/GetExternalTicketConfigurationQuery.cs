using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.ExternalTickets.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.ExternalTickets.Queries;

public record GetExternalTicketConfigurationQuery : IRequest<ExternalTicketConfigurationDto>;

public class GetExternalTicketConfigurationHandler(
    IApplicationDbContext db, ICurrentUser currentUser, IPermissionService permissionService)
    : IRequestHandler<GetExternalTicketConfigurationQuery, ExternalTicketConfigurationDto>
{
    public async Task<ExternalTicketConfigurationDto> Handle(GetExternalTicketConfigurationQuery request, CancellationToken ct)
    {
        await ExternalTicketConfigAccess.EnsureManagePermissionAsync(currentUser, permissionService, ct);

        var config = await ExternalTicketConfigAccess.LoadConfigurationAsync(db, ct);

        return new ExternalTicketConfigurationDto(config.Id, config.TargetCompanyId,
            config.IsEnabled, config.RequireOaFriendship, config.UpdatedAt);
    }
}
