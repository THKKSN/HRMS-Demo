using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Memos.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Memos.Queries;

public record GetMyMemosQuery(MemoStatus? Status) : IRequest<IReadOnlyList<MemoListItemDto>>;

public class GetMyMemosHandler(IApplicationDbContext db, ICurrentUser currentUser, IPermissionService permService)
    : IRequestHandler<GetMyMemosQuery, IReadOnlyList<MemoListItemDto>>
{
    public async Task<IReadOnlyList<MemoListItemDto>> Handle(GetMyMemosQuery request, CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permService, "memo:view-own", ct);

        if (currentUser.EmployeeId is not { } requesterId)
            throw new AppUnauthorizedException("ไม่พบตัวตนผู้ใช้");

        var query = db.Memos.Where(x => x.RequesterId == requesterId);
        if (request.Status is { } status)
            query = query.Where(x => x.Status == status);

        return await query
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new MemoListItemDto(
                x.Id, x.MemoNo, x.MemoType.Name, x.MemoCategoryNameSnapshot, x.MemoSubCategoryNameSnapshot,
                x.Status, x.AcknowledgedAt, x.DeliveredAt, x.ReceivedAt, x.CreatedAt))
            .ToListAsync(ct);
    }
}
