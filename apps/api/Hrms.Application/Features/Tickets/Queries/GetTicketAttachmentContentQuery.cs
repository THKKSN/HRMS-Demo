using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Tickets.Queries;

public record TicketAttachmentContentDto(
    string StorageKey,
    string FileName,
    string ContentType);

public record GetTicketAttachmentContentQuery(Guid TicketId, Guid AttachmentId)
    : IRequest<TicketAttachmentContentDto>;

public class GetTicketAttachmentContentHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissions)
    : IRequestHandler<GetTicketAttachmentContentQuery, TicketAttachmentContentDto>
{
    public async Task<TicketAttachmentContentDto> Handle(
        GetTicketAttachmentContentQuery request,
        CancellationToken ct)
    {
        var ticket = await db.Tickets.AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == request.TicketId, ct)
            ?? throw new KeyNotFoundException("ไม่พบใบแจ้งเรื่อง");
        await TicketAccess.EnsureCanViewAsync(db, currentUser, permissions, ticket, ct);
        var attachment = await db.TicketAttachments.AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == request.AttachmentId && a.TicketId == ticket.Id, ct)
            ?? throw new KeyNotFoundException("ไม่พบไฟล์แนบ");

        if (attachment.Visibility == TicketAttachmentVisibility.Internal)
        {
            var isRequester = currentUser.EmployeeId == ticket.RequesterEmployeeId;
            var canSeeInternal = !isRequester &&
                await permissions.HasPermissionAsync(currentUser, "ticket:add-internal-note", ct) &&
                (currentUser.HasRole(RoleType.Admin) ||
                    await TicketAccess.IsDepartmentManagerAsync(db, currentUser, ticket, ct));
            if (!canSeeInternal)
                throw new AppForbiddenException("ไม่มีสิทธิ์เปิดไฟล์ภายใน");
        }

        var key = attachment.StorageKey ?? ExtractLegacyKey(attachment.Url)
            ?? throw new FileNotFoundException("ไม่พบตำแหน่งไฟล์");
        return new TicketAttachmentContentDto(
            key,
            attachment.FileName ?? "attachment",
            InferContentType(attachment.ContentType, attachment.Url));
    }

    private static string? ExtractLegacyKey(string value)
    {
        var path = Uri.TryCreate(value, UriKind.Absolute, out var absolute)
            ? absolute.AbsolutePath
            : value;
        const string marker = "/uploads/";
        var index = path.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
        return index < 0 ? null : Uri.UnescapeDataString(path[(index + marker.Length)..]);
    }

    private static string InferContentType(string? contentType, string url)
    {
        if (!string.IsNullOrWhiteSpace(contentType)) return contentType;
        var path = Uri.TryCreate(url, UriKind.Absolute, out var absolute)
            ? absolute.AbsolutePath
            : url;
        return Path.GetExtension(path).ToLowerInvariant() switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".webp" => "image/webp",
            ".pdf" => "application/pdf",
            _ => "application/octet-stream"
        };
    }
}
