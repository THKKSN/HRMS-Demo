using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.ExternalTickets.Dtos;
using Hrms.Application.Features.Tickets;
using Hrms.Domain.Constants;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.ExternalTickets.Commands;

public record CreateExternalTicketCommand(
    Guid ExternalTicketSubjectId,
    string Detail,
    string? LocationText,
    string? ContactPhone,
    string? ContactNote,
    IReadOnlyList<string>? AttachmentUrls) : IRequest<ExternalTicketCreatedDto>;

public class CreateExternalTicketValidator : AbstractValidator<CreateExternalTicketCommand>
{
    public CreateExternalTicketValidator()
    {
        RuleFor(x => x.ExternalTicketSubjectId).NotEmpty();
        RuleFor(x => x.Detail).NotEmpty().MaximumLength(2000);
        RuleFor(x => x.LocationText).MaximumLength(200);
        RuleFor(x => x.ContactPhone).MaximumLength(30);
        RuleFor(x => x.ContactNote).MaximumLength(500);
    }
}

public class CreateExternalTicketHandler(
    IApplicationDbContext db,
    IExternalCurrentUser currentUser,
    ITicketNumberGenerator ticketNumberGenerator,
    ITicketRequesterResolver requesterResolver,
    IAuditLogService auditLog) : IRequestHandler<CreateExternalTicketCommand, ExternalTicketCreatedDto>
{
    public async Task<ExternalTicketCreatedDto> Handle(CreateExternalTicketCommand request, CancellationToken ct)
    {
        var reporterId = currentUser.ExternalReporterId
            ?? throw new AppUnauthorizedException("EXTERNAL_UNAUTHENTICATED");

        var reporter = await db.ExternalReporters
            .FirstOrDefaultAsync(r => r.Id == reporterId && r.IsActive, ct)
            ?? throw new AppUnauthorizedException("EXTERNAL_REPORTER_INACTIVE");

        var config = await db.ExternalTicketConfigurations
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.TargetCompanyId == ExternalTicketConstants.TargetCompanyId, ct);
        if (config is null || !config.IsEnabled)
            throw new ConflictException("EXTERNAL_CHANNEL_DISABLED", "ช่องทางแจ้งเรื่องสำหรับบุคคลภายนอกปิดใช้งานอยู่");

        // โปรไฟล์ต้องครบก่อนแจ้งเรื่อง — HrmsDbContext บังคับ snapshot 4 ตัวไม่ว่างตอน SaveChanges อยู่แล้ว เช็คก่อนเพื่อ error ที่สื่อสารได้
        if (string.IsNullOrWhiteSpace(reporter.FullName) ||
            string.IsNullOrWhiteSpace(reporter.Phone) ||
            string.IsNullOrWhiteSpace(reporter.Email) ||
            string.IsNullOrWhiteSpace(reporter.Organization))
            throw new ConflictException("EXTERNAL_PROFILE_INCOMPLETE", "กรุณากรอกโปรไฟล์ (ชื่อ เบอร์โทร อีเมล หน่วยงาน) ให้ครบก่อนแจ้งเรื่อง");

        // ไม่มีขั้น consent privacy notice ในแอปแล้ว — consent จัดการที่ระดับ LINE ไปแล้ว
        var subject = await db.ExternalTicketSubjects
            .AsNoTracking()
            .Where(s => s.Id == request.ExternalTicketSubjectId && s.IsActive)
            .Select(s => new
            {
                s.Id,
                s.Name,
                TopicId = s.Topic.Id,
                TopicName = s.Topic.Name,
                TopicIsActive = s.Topic.IsActive,
                CategoryId = s.Topic.Category.Id,
                CategoryName = s.Topic.Category.Name,
                CategoryIsActive = s.Topic.Category.IsActive,
            })
            .FirstOrDefaultAsync(ct);
        if (subject is null || !subject.TopicIsActive || !subject.CategoryIsActive)
            throw new ConflictException("EXTERNAL_SUBJECT_UNAVAILABLE", "หัวข้อที่เลือกไม่พร้อมใช้งาน กรุณาโหลดรายการหัวข้อใหม่");

        var now = DateTime.UtcNow.AddHours(7);
        var uploadTokens = (request.AttachmentUrls ?? [])
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Select(ParseUploadId)
            .Distinct()
            .ToList();
        if (uploadTokens.Count > 10)
            throw new FluentValidation.ValidationException("แนบหลักฐานตอนเปิดเรื่องได้ไม่เกิน 10 ไฟล์");
        var pendingUploads = await db.TicketPendingUploads
            .Where(upload => uploadTokens.Contains(upload.Id) &&
                upload.UploadedByExternalReporterId == reporter.Id &&
                upload.LinkedAt == null)
            .ToListAsync(ct);
        if (pendingUploads.Count != uploadTokens.Count)
            throw new FluentValidation.ValidationException("ไฟล์อัปโหลดไม่ถูกต้อง ถูกใช้งานแล้ว หรือไม่ใช่ของผู้ใช้");

        var requester = requesterResolver.FromExternalReporter(reporter);

        var ticket = new Ticket
        {
            TicketNo = await ticketNumberGenerator.NextAsync(DateOnly.FromDateTime(now), ct),
            RequestType = TicketRequestType.External,
            ExternalReporterId = reporter.Id,
            TargetCompanyId = ExternalTicketConstants.TargetCompanyId,
            TargetDepartmentId = null,
            ExternalTicketCategoryId = subject.CategoryId,
            ExternalTicketTopicId = subject.TopicId,
            ExternalTicketSubjectId = subject.Id,
            Title = subject.Name.Trim(),
            Detail = request.Detail.Trim(),
            Priority = TicketPriority.Medium,
            Status = TicketStatus.Open,
            SourceChannel = TicketSourceChannel.ExternalPortal,
            // ไม่ auto-route — เข้า inbox กลางให้ Supervisor ของบริษัทที่ fix ไว้จ่ายงานเองทั้งหมด
            RoutingMode = TicketRoutingMode.SupervisorAssign,
            RoutingLevel = TicketRoutingLevel.None,
            RoutingOutcome = TicketRoutingOutcome.SupervisorQueue,
            LocationText = TrimOrNull(request.LocationText),
            ContactPhone = TrimOrNull(request.ContactPhone) ?? reporter.Phone,
            ContactNote = TrimOrNull(request.ContactNote),
            RequesterNameSnapshot = Bound(requester.DisplayName, 200),
            RequesterPhoneSnapshot = reporter.Phone,
            RequesterEmailSnapshot = reporter.Email,
            RequesterOrganizationSnapshot = reporter.Organization,
            RequesterLineDisplayNameSnapshot = Bound(reporter.LineDisplayName, 200),
        };

        foreach (var upload in pendingUploads)
        {
            var attachment = new TicketAttachment
            {
                UploadedByExternalReporterId = reporter.Id,
                FileName = upload.FileName,
                ContentType = upload.ContentType,
                SizeBytes = upload.SizeBytes,
                StorageKey = upload.StorageKey,
                Stage = TicketAttachmentStage.Created,
                Visibility = TicketAttachmentVisibility.Public
            };
            attachment.Url = $"/tickets/{ticket.Id}/attachments/{attachment.Id}/content";
            ticket.Attachments.Add(attachment);
            upload.LinkedAt = now;
            upload.TicketAttachmentId = attachment.Id;
        }

        db.Tickets.Add(ticket);
        TicketStatusTransition.Record(db, ticket, null, TicketStatus.Open, null, ticket.CreatedAt, "ExternalTicketCreated");

        await db.ExecuteInTransactionAsync(async transactionCt =>
        {
            await db.SaveChangesAsync(transactionCt);
            await auditLog.LogAsync(
                "ticket", "Ticket", ticket.Id.ToString(), "create",
                $"{requester.DisplayName} (บุคคลภายนอก) เปิดใบแจ้งเรื่อง {ticket.TicketNo}: {ticket.Title}",
                null, new
                {
                    ticket.TicketNo, ticket.TargetCompanyId,
                    ticket.ExternalTicketCategoryId, ticket.ExternalTicketTopicId, ticket.ExternalTicketSubjectId,
                    ticket.Priority, ticket.Status, ticket.SourceChannel
                }, transactionCt);
        }, ct);

        return new ExternalTicketCreatedDto(
            ticket.Id,
            ticket.TicketNo,
            subject.CategoryName,
            subject.TopicName,
            subject.Name,
            ticket.Title,
            ticket.Status,
            ticket.CreatedAt);
    }

    private static Guid ParseUploadId(string value)
    {
        const string prefix = "ticket-upload:";
        var token = value.Trim();
        if (!token.StartsWith(prefix, StringComparison.OrdinalIgnoreCase) ||
            !Guid.TryParse(token[prefix.Length..], out var uploadId))
            throw new FluentValidation.ValidationException("ไฟล์แนบต้องอัปโหลดผ่านระบบ Ticket");
        return uploadId;
    }

    private static string? TrimOrNull(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string Bound(string value, int maxLength)
        => value.Length <= maxLength ? value : value[..maxLength];
}
