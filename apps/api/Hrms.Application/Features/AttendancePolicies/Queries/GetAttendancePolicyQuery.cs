using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.AttendancePolicies.Commands;
using Hrms.Application.Features.AttendancePolicies.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.AttendancePolicies.Queries;

public record GetAttendancePolicyQuery(Guid CompanyId) : IRequest<AttendancePolicyDto?>;

public class GetAttendancePolicyHandler(IApplicationDbContext db, IScopeGuard scope)
    : IRequestHandler<GetAttendancePolicyQuery, AttendancePolicyDto?>
{
    public async Task<AttendancePolicyDto?> Handle(GetAttendancePolicyQuery request, CancellationToken ct)
    {
        await scope.ThrowIfCannotAccessAsync(request.CompanyId, ct);

        var policy = await db.AttendancePolicies
            .Include(p => p.Company)
            .FirstOrDefaultAsync(p => p.CompanyId == request.CompanyId && p.IsActive, ct);

        return policy is null ? null : UpsertAttendancePolicyHandler.ToDto(policy);
    }
}
