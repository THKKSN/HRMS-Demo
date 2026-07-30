using System.Text.Json;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Tickets.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Tickets.Queries;

public record GetTicketReviewsQuery(Guid TicketId) : IRequest<IReadOnlyList<TicketReviewDto>>;

public class GetTicketReviewsHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissions)
    : IRequestHandler<GetTicketReviewsQuery, IReadOnlyList<TicketReviewDto>>
{
    public async Task<IReadOnlyList<TicketReviewDto>> Handle(GetTicketReviewsQuery request, CancellationToken ct)
    {
        var ticket = await db.Tickets.AsNoTracking().FirstOrDefaultAsync(t => t.Id == request.TicketId, ct)
            ?? throw new KeyNotFoundException("ไม่พบใบแจ้งเรื่อง");
        await TicketAccess.EnsureCanViewAsync(db, currentUser, permissions, ticket, ct);

        var reviews = await db.TicketReviews.AsNoTracking()
            .Where(r => r.TicketId == request.TicketId)
            .Include(r => r.ReviewedByEmployee)
            .Include(r => r.ResolvedByEmployee)
            .OrderBy(r => r.ReviewRound)
            .ToListAsync(ct);

        return reviews.Select(r => new TicketReviewDto(
            r.Id, r.TicketId, r.ReviewRound, r.Decision, r.ReviewNote,
            r.ReviewedByEmployeeId, TicketCommandSupport.FullName(r.ReviewedByEmployee), r.ReviewedAt,
            r.ResolvedByEmployeeId,
            r.ResolvedByEmployee is null ? null : TicketCommandSupport.FullName(r.ResolvedByEmployee),
            r.ResolvedAt, r.ProblemTypeSnapshot, r.InitialInspectionSnapshot, r.ResolutionSnapshot,
            DeserializeIds(r.ResolvedAttachmentIdsJson))).ToList();
    }

    private static IReadOnlyList<Guid> DeserializeIds(string json)
    {
        try { return JsonSerializer.Deserialize<List<Guid>>(json) ?? []; }
        catch (JsonException) { return []; }
    }
}
