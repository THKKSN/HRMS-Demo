using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Memos.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Memos.Queries;

// IncludeInactive = true สำหรับหน้า settings (เห็น step ที่ปิดใช้งานด้วย)
public record GetMemoWorkflowStepsQuery(Guid MemoTypeId, bool IncludeInactive = false)
    : IRequest<IReadOnlyList<MemoWorkflowStepDto>>;

public class GetMemoWorkflowStepsHandler(IApplicationDbContext db)
    : IRequestHandler<GetMemoWorkflowStepsQuery, IReadOnlyList<MemoWorkflowStepDto>>
{
    public async Task<IReadOnlyList<MemoWorkflowStepDto>> Handle(GetMemoWorkflowStepsQuery request, CancellationToken ct)
    {
        var query = db.MemoWorkflowSteps.AsNoTracking()
            .Where(x => x.MemoTypeId == request.MemoTypeId);
        if (!request.IncludeInactive)
            query = query.Where(x => x.IsActive);

        return await query
            .OrderBy(x => x.SortOrder)
            .Select(x => new MemoWorkflowStepDto(
                x.Id, x.MemoTypeId, x.SortOrder, x.Label, x.StepKind,
                x.AssigneeRoleCode, x.AssigneeEmployeeId,
                x.AssigneeEmployee == null ? null : (x.AssigneeEmployee.FirstName + " " + x.AssigneeEmployee.LastName).Trim(),
                x.IsActive))
            .ToListAsync(ct);
    }
}
