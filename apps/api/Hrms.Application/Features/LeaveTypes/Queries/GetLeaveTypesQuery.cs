using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.LeaveTypes.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.LeaveTypes.Queries;

public record GetLeaveTypesQuery : IRequest<IReadOnlyList<LeaveTypeDto>>;

public class GetLeaveTypesHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<GetLeaveTypesQuery, IReadOnlyList<LeaveTypeDto>>
{
    public async Task<IReadOnlyList<LeaveTypeDto>> Handle(GetLeaveTypesQuery request, CancellationToken ct)
    {
        var companyId = currentUser.CompanyId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

        return await db.LeaveTypes
            .Where(lt => lt.IsActive && lt.CompanyId == companyId)
            .OrderBy(lt => lt.NameTh)
            .Select(lt => new LeaveTypeDto(
                lt.Id,
                lt.Code,
                lt.NameTh,
                lt.NameEn,
                lt.DefaultDaysPerYear,
                lt.RequiresAttachment,
                lt.IsActive))
            .ToListAsync(ct);
    }
}
