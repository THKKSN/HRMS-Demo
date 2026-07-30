using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Permissions.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Permissions.Queries;

public record GetPermissionsQuery(string? Module = null)
    : IRequest<IReadOnlyList<PermissionDto>>;

public class GetPermissionsHandler(IApplicationDbContext db)
    : IRequestHandler<GetPermissionsQuery, IReadOnlyList<PermissionDto>>
{
    public async Task<IReadOnlyList<PermissionDto>> Handle(
        GetPermissionsQuery request, CancellationToken cancellationToken)
    {
        var query = db.Permissions.AsQueryable();

        if (!string.IsNullOrEmpty(request.Module))
            query = query.Where(p => p.Module == request.Module);

        return await query
            .OrderBy(p => p.Module)
            .ThenBy(p => p.Action)
            .Select(p => new PermissionDto(p.Id, p.Code, p.Module, p.Action, p.Description, p.IsSystem))
            .ToListAsync(cancellationToken);
    }
}
