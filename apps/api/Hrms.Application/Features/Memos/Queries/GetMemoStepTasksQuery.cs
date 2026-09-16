using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Memos.Dtos;
using Hrms.Application.Features.Memos.Services;
using MediatR;

namespace Hrms.Application.Features.Memos.Queries;

// ขั้นตอนที่รอ user ปัจจุบันดำเนินการ — ไม่ผูก permission เพราะผู้รับผิดชอบขั้นตอนเป็น role ไหนก็ได้
// (ถูกปักหมุดรายคนหรือเป็นทุกคนใน role ที่ scope ตรงหน่วยงานปลายทาง)
public record GetMemoStepTasksQuery : IRequest<IReadOnlyList<MemoStepTaskDto>>;

public class GetMemoStepTasksHandler(IMemoStepTaskResolver resolver, ICurrentUser currentUser)
    : IRequestHandler<GetMemoStepTasksQuery, IReadOnlyList<MemoStepTaskDto>>
{
    public async Task<IReadOnlyList<MemoStepTaskDto>> Handle(GetMemoStepTasksQuery request, CancellationToken ct)
    {
        if (currentUser.EmployeeId is not { } employeeId)
            throw new AppUnauthorizedException("EMPLOYEE_NOT_FOUND", "Current user has no employee record.");

        return await resolver.ResolveAsync(employeeId, ct);
    }
}
