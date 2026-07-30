using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.OtRequests.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.OtRequests.Queries.GetOtRequestById;

public record GetOtRequestByIdQuery(Guid Id) : IRequest<OtRequestDto?>;

public class GetOtRequestByIdHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<GetOtRequestByIdQuery, OtRequestDto?>
{
    public async Task<OtRequestDto?> Handle(GetOtRequestByIdQuery request, CancellationToken ct)
    {
        var employeeId = currentUser.EmployeeId
            ?? throw new UnauthorizedAccessException();

        var ot = await db.OtRequests
            .Include(o => o.Employee).ThenInclude(e => e.Department)
            .FirstOrDefaultAsync(o => o.Id == request.Id, ct);

        if (ot is null) return null;

        // เจ้าของ, supervisor ที่รับผิดชอบ, หรือ employee ใน team เท่านั้น
        if (ot.EmployeeId != employeeId && ot.SupervisorId != employeeId)
            throw new UnauthorizedAccessException();

        string? supervisorName = null;
        string? hrName = null;

        if (ot.SupervisorId.HasValue)
        {
            var sup = await db.Employees.Where(e => e.Id == ot.SupervisorId.Value)
                .Select(e => new { e.FirstName, e.LastName }).FirstOrDefaultAsync(ct);
            supervisorName = sup is not null ? $"{sup.FirstName} {sup.LastName}".Trim() : null;
        }

        if (ot.HrId.HasValue)
        {
            var hr = await db.Employees.Where(e => e.Id == ot.HrId.Value)
                .Select(e => new { e.FirstName, e.LastName }).FirstOrDefaultAsync(ct);
            hrName = hr is not null ? $"{hr.FirstName} {hr.LastName}".Trim() : null;
        }

        return OtRequestMapper.ToDto(ot, ot.Employee.Department?.Name, supervisorName, hrName);
    }
}
