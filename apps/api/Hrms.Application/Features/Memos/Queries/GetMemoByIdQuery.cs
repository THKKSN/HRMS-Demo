using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Memos.Dtos;
using Hrms.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Memos.Queries;

public record GetMemoByIdQuery(Guid Id) : IRequest<MemoDto>;

public class GetMemoByIdHandler(IApplicationDbContext db) : IRequestHandler<GetMemoByIdQuery, MemoDto>
{
    public async Task<MemoDto> Handle(GetMemoByIdQuery request, CancellationToken ct)
    {
        var memo = await db.Memos
            .Include(x => x.MemoType)
            .Include(x => x.Requester)
            .Include(x => x.ApprovedByEmployee)
            .Include(x => x.AcknowledgedByEmployee)
            .Include(x => x.DeliveredByEmployee)
            .Include(x => x.ReceivedByEmployee)
            .Include(x => x.Company)
            .Include(x => x.Department)
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == request.Id, ct)
            ?? throw new KeyNotFoundException("ไม่พบเรื่อง");

        return new MemoDto(
            memo.Id, memo.MemoNo, memo.MemoTypeId, memo.MemoType.Name,
            memo.MemoCategoryId, memo.MemoCategoryNameSnapshot,
            memo.MemoSubCategoryId, memo.MemoSubCategoryNameSnapshot,
            memo.Detail, memo.RequesterId, FullName(memo.Requester),
            memo.CompanyId, memo.Company.Name, memo.DepartmentId, memo.Department.Name, memo.Status,
            memo.ApprovedAt,
            memo.ApprovedByEmployee is null ? null : FullName(memo.ApprovedByEmployee),
            memo.RejectedAt, memo.RejectReason,
            memo.AcknowledgedAt,
            memo.AcknowledgedByEmployee is null ? null : FullName(memo.AcknowledgedByEmployee),
            memo.DeliveredAt,
            memo.DeliveredByEmployee is null ? null : FullName(memo.DeliveredByEmployee),
            memo.ReceivedAt,
            memo.ReceivedByEmployee is null ? null : FullName(memo.ReceivedByEmployee),
            memo.CreatedAt);
    }

    private static string FullName(Employee employee)
        => $"{employee.FirstName} {employee.LastName}".Trim();
}
