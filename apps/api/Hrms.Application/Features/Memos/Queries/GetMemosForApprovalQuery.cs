using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Memos.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Memos.Queries;

// Status = null → คืนทุกสถานะ (สำหรับหน้า list ที่มี filter เลือกดูเอง)
public record GetMemosForApprovalQuery(MemoStatus? Status) : IRequest<IReadOnlyList<PendingMemoItemDto>>;

public class GetMemosForApprovalHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<GetMemosForApprovalQuery, IReadOnlyList<PendingMemoItemDto>>
{
    public async Task<IReadOnlyList<PendingMemoItemDto>> Handle(GetMemosForApprovalQuery request, CancellationToken ct)
    {
        if (currentUser.EmployeeId is not { } employeeId)
            throw new AppUnauthorizedException("EMPLOYEE_NOT_FOUND", "Current user has no employee record.");

        // เห็นเฉพาะเรื่องที่ตัวเองเป็นผู้อนุมัติด่านแรกตาม snapshot — ระบุคนต้องตรงคน,
        // pool ต้องถือ role นั้นอยู่ (ทั้งระบบ ไม่ scope บริษัท) — Admin เห็นทุกเรื่องเหมือนเดิม
        var roleCodes = await db.EmployeeRoles.AsNoTracking()
            .Where(er => er.EmployeeId == employeeId && er.IsActive)
            .Select(er => er.Role.Code)
            .Distinct()
            .ToListAsync(ct);

        var query = db.Memos.AsQueryable();
        if (!roleCodes.Contains(RoleType.Admin))
        {
            query = query.Where(m =>
                (m.FirstApproverEmployeeIdSnapshot == null || m.FirstApproverEmployeeIdSnapshot == employeeId) &&
                roleCodes.Contains(m.FirstApproverRoleCodeSnapshot));
        }

        if (request.Status is { } status)
            query = query.Where(x => x.Status == status);

        return await query
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new PendingMemoItemDto(
                x.Id, x.MemoNo, x.MemoType.Name, x.MemoCategoryNameSnapshot, x.MemoSubCategoryNameSnapshot,
                x.Detail, x.RequesterId, x.Requester.FirstName + " " + x.Requester.LastName,
                x.Company.Name, x.Department.Name, x.Status, x.CreatedAt))
            .ToListAsync(ct);
    }
}
