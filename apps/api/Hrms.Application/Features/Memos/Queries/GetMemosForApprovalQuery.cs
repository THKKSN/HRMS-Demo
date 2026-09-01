using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Memos.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Memos.Queries;

// Status = null → คืนทุกสถานะ (สำหรับหน้า list ที่มี filter เลือกดูเอง)
public record GetMemosForApprovalQuery(MemoStatus? Status) : IRequest<IReadOnlyList<PendingMemoItemDto>>;

public class GetMemosForApprovalHandler(IApplicationDbContext db, ICurrentUser currentUser, IPermissionService permService)
    : IRequestHandler<GetMemosForApprovalQuery, IReadOnlyList<PendingMemoItemDto>>
{
    public async Task<IReadOnlyList<PendingMemoItemDto>> Handle(GetMemosForApprovalQuery request, CancellationToken ct)
    {
        // pool ทั้งระบบ ไม่ scope ตาม company/department — ใครมี permission memo:approve เห็นทุกเรื่องเหมือนกัน
        await currentUser.ThrowIfNoPermissionAsync(permService, "memo:approve", ct);

        var query = db.Memos.AsQueryable();
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
