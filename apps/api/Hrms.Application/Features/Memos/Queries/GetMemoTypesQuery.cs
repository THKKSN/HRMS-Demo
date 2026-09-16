using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Memos.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Memos.Queries;

public record GetMemoTypesQuery(bool IncludeInactive = false) : IRequest<IReadOnlyList<MemoTypeDto>>;

public class GetMemoTypesHandler(IApplicationDbContext db)
    : IRequestHandler<GetMemoTypesQuery, IReadOnlyList<MemoTypeDto>>
{
    public async Task<IReadOnlyList<MemoTypeDto>> Handle(GetMemoTypesQuery request, CancellationToken ct)
    {
        var query = db.MemoTypes.AsQueryable();
        if (!request.IncludeInactive)
            query = query.Where(x => x.IsActive);

        return await query
            .OrderBy(x => x.Name)
            .Select(x => new MemoTypeDto(
                x.Id, x.Name, x.CompanyId, x.Company.Name, x.DepartmentId, x.Department.Name, x.IsActive,
                x.FirstApproverRoleCode, x.FirstApproverEmployeeId,
                x.FirstApproverEmployee == null ? null : (x.FirstApproverEmployee.FirstName + " " + x.FirstApproverEmployee.LastName).Trim(),
                // expression tree ใช้ named argument ไม่ได้ (CS0853) — ลำดับต้องตรงกับ MemoTypeDto
                x.NameEn, x.NameId,
                x.Company.NameEn, x.Company.NameId,
                x.Department.NameEn, x.Department.NameId))
            .ToListAsync(ct);
    }
}
