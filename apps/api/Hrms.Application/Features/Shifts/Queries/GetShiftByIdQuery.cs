using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Shifts.Commands;
using Hrms.Application.Features.Shifts.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Shifts.Queries;

public record GetShiftByIdQuery(Guid Id) : IRequest<ShiftDto>;

public class GetShiftByIdHandler(IApplicationDbContext db, IScopeGuard scope)
    : IRequestHandler<GetShiftByIdQuery, ShiftDto>
{
    public async Task<ShiftDto> Handle(GetShiftByIdQuery request, CancellationToken ct)
    {
        var shift = await db.Shifts
            .Include(s => s.Company)
            .FirstOrDefaultAsync(s => s.Id == request.Id, ct)
            ?? throw new NotFoundException("Shift", request.Id, "SHIFT_NOT_FOUND");

        await scope.ThrowIfCannotAccessAsync(shift.CompanyId, ct);

        return CreateShiftHandler.ToDto(shift);
    }
}
