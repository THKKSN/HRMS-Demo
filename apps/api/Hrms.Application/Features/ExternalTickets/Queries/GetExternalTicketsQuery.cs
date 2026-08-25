using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.ExternalTickets.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.ExternalTickets.Queries;

// External reporter อ่านได้เฉพาะ ticket ของตัวเองเท่านั้น
public record GetExternalTicketsQuery(int Page = 1, int PageSize = 10)
    : IRequest<ExternalTicketListDto>;

public class GetExternalTicketsHandler(
    IApplicationDbContext db, IExternalCurrentUser currentUser)
    : IRequestHandler<GetExternalTicketsQuery, ExternalTicketListDto>
{
    public async Task<ExternalTicketListDto> Handle(GetExternalTicketsQuery request, CancellationToken ct)
    {
        var reporterId = currentUser.ExternalReporterId
            ?? throw new AppUnauthorizedException("EXTERNAL_UNAUTHENTICATED");

        var query = db.Tickets.AsNoTracking()
            .Where(t => t.ExternalReporterId == reporterId);

        var totalCount = await query.CountAsync(ct);
        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 1, 20);

        var items = await query
            .OrderByDescending(t => t.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(t => new ExternalTicketListItemDto(
                t.Id,
                t.TicketNo,
                t.Title,
                t.Status,
                t.ExternalTicketCategory != null ? t.ExternalTicketCategory.Name : null,
                t.ExternalTicketTopic != null ? t.ExternalTicketTopic.Name : null,
                t.ExternalTicketSubject != null ? t.ExternalTicketSubject.Name : null,
                t.CreatedAt,
                t.UpdatedAt))
            .ToListAsync(ct);

        return new ExternalTicketListDto(items, totalCount, page, pageSize);
    }
}

public record GetExternalTicketDetailQuery(Guid TicketId) : IRequest<ExternalTicketDetailDto>;

public class GetExternalTicketDetailHandler(
    IApplicationDbContext db, IExternalCurrentUser currentUser)
    : IRequestHandler<GetExternalTicketDetailQuery, ExternalTicketDetailDto>
{
    public async Task<ExternalTicketDetailDto> Handle(GetExternalTicketDetailQuery request, CancellationToken ct)
    {
        var reporterId = currentUser.ExternalReporterId
            ?? throw new AppUnauthorizedException("EXTERNAL_UNAUTHENTICATED");

        var ticket = await db.Tickets.AsNoTracking()
            .Where(t => t.Id == request.TicketId && t.ExternalReporterId == reporterId)
            .Select(t => new ExternalTicketDetailDto(
                t.Id,
                t.TicketNo,
                t.Title,
                t.Detail,
                t.Status,
                t.ExternalTicketCategory != null ? t.ExternalTicketCategory.Name : null,
                t.ExternalTicketTopic != null ? t.ExternalTicketTopic.Name : null,
                t.ExternalTicketSubject != null ? t.ExternalTicketSubject.Name : null,
                t.LocationText,
                t.ContactPhone,
                t.ContactNote,
                t.ResolutionNote,
                t.WorkflowCurrentStepKey,
                t.Attachments
                    .Where(a => a.Visibility == TicketAttachmentVisibility.Public)
                    .Select(a => new ExternalTicketAttachmentDto(a.Id, a.Url, a.FileName, a.ContentType, a.SizeBytes))
                    .ToList(),
                t.CreatedAt,
                t.UpdatedAt))
            .FirstOrDefaultAsync(ct)
            ?? throw new KeyNotFoundException("ไม่พบใบแจ้งเรื่อง");

        return ticket;
    }
}
