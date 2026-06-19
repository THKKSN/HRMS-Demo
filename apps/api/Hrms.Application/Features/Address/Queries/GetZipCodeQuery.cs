using Hrms.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Address.Queries;

public record GetZipCodeQuery(int SubDistrictId) : IRequest<string?>;

public class GetZipCodeHandler(IApplicationDbContext db)
    : IRequestHandler<GetZipCodeQuery, string?>
{
    public async Task<string?> Handle(GetZipCodeQuery request, CancellationToken ct)
    {
        return await db.ZipCodes
            .Where(z => z.SubDistrictId == request.SubDistrictId)
            .Select(z => z.Zipcode)
            .FirstOrDefaultAsync(ct);
    }
}
