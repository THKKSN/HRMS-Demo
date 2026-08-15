using FluentAssertions;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using Hrms.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Tests.Tickets;

public sealed class ExternalTicketPersistenceTests
{
    [Fact]
    public async Task ExternalTicket_ShouldPersistReporterAndStableSnapshot()
    {
        await using var db = CreateDb();
        var reporter = Reporter("U-external-1", "สมชาย ผู้แจ้ง");
        var ticket = ExternalTicket(reporter, "สมชาย ผู้แจ้ง");

        db.ExternalReporters.Add(reporter);
        db.Tickets.Add(ticket);
        await db.SaveChangesAsync();

        reporter.FullName = "ชื่อที่เปลี่ยนภายหลัง";
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();

        var saved = await db.Tickets.AsNoTracking().SingleAsync(x => x.Id == ticket.Id);
        saved.RequestType.Should().Be(TicketRequestType.External);
        saved.RequesterEmployeeId.Should().BeNull();
        saved.ExternalReporterId.Should().Be(reporter.Id);
        saved.RequesterNameSnapshot.Should().Be("สมชาย ผู้แจ้ง");
        saved.RequesterPhoneSnapshot.Should().Be("0812345678");
        saved.RequesterEmailSnapshot.Should().Be("somchai@example.com");
        saved.RequesterOrganizationSnapshot.Should().Be("Supplier A");
    }

    [Fact]
    public async Task Ticket_ShouldRejectBothEmployeeAndExternalRequester()
    {
        await using var db = CreateDb();
        var reporter = Reporter("U-external-2", "สมหญิง ผู้แจ้ง");
        var ticket = ExternalTicket(reporter, reporter.FullName!);
        ticket.RequesterEmployeeId = Guid.NewGuid();
        db.ExternalReporters.Add(reporter);
        db.Tickets.Add(ticket);

        var act = () => db.SaveChangesAsync();

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("TICKET_REQUESTER_EXACTLY_ONE_REQUIRED");
    }

    [Fact]
    public async Task Ticket_ShouldRejectMissingRequester()
    {
        await using var db = CreateDb();
        var ticket = ExternalTicket(null, "ไม่ทราบชื่อ");
        db.Tickets.Add(ticket);

        var act = () => db.SaveChangesAsync();

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("TICKET_REQUESTER_EXACTLY_ONE_REQUIRED");
    }

    [Fact]
    public async Task ExternalComment_ShouldRejectReporterWhoDoesNotOwnTicket()
    {
        await using var db = CreateDb();
        var owner = Reporter("U-owner", "เจ้าของเรื่อง");
        var other = Reporter("U-other", "บุคคลอื่น");
        var ticket = ExternalTicket(owner, owner.FullName!);
        db.AddRange(owner, other, ticket);
        await db.SaveChangesAsync();

        db.TicketComments.Add(new TicketComment
        {
            TicketId = ticket.Id,
            ExternalReporterId = other.Id,
            Message = "ไม่ควรเพิ่มข้อความในเรื่องของผู้อื่น"
        });

        var act = () => db.SaveChangesAsync();

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("EXTERNAL_ACTOR_DOES_NOT_OWN_TICKET");
    }

    [Fact]
    public async Task Attachment_ShouldRejectBothEmployeeAndExternalUploader()
    {
        await using var db = CreateDb();
        var reporter = Reporter("U-external-3", "ผู้แนบไฟล์");
        var ticket = ExternalTicket(reporter, reporter.FullName!);
        db.AddRange(reporter, ticket);
        await db.SaveChangesAsync();

        db.TicketAttachments.Add(new TicketAttachment
        {
            TicketId = ticket.Id,
            UploadedByEmployeeId = Guid.NewGuid(),
            UploadedByExternalReporterId = reporter.Id,
            Url = "/protected/external/evidence.jpg",
            FileName = "evidence.jpg",
            ContentType = "image/jpeg",
            SizeBytes = 100
        });

        var act = () => db.SaveChangesAsync();

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("TICKET_ACTOR_EXACTLY_ONE_REQUIRED");
    }

    private static HrmsDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<HrmsDbContext>()
            .UseInMemoryDatabase($"external-ticket-persistence-{Guid.NewGuid():N}")
            .Options;
        return new HrmsDbContext(options);
    }

    private static ExternalReporter Reporter(string lineUserId, string fullName) => new()
    {
        LineUserId = lineUserId,
        LineDisplayName = fullName,
        FullName = fullName,
        Phone = "0812345678",
        Email = "somchai@example.com",
        Organization = "Supplier A",
        PrivacyNoticeVersion = "2026-08-15",
        ConsentedAt = DateTime.UtcNow,
        LastLoginAt = DateTime.UtcNow
    };

    private static Ticket ExternalTicket(ExternalReporter? reporter, string requesterName) => new()
    {
        TicketNo = $"EXT-{Guid.NewGuid():N}"[..20],
        RequestType = TicketRequestType.External,
        ExternalReporterId = reporter?.Id,
        TargetCompanyId = Guid.Parse("c89cb0d1-7548-4c1b-a36a-929f094f0b30"),
        TargetDepartmentId = Guid.NewGuid(),
        CategoryId = Guid.NewGuid(),
        TopicId = Guid.NewGuid(),
        Title = "แจ้งปัญหาจากภายนอก",
        Detail = "รายละเอียดปัญหา",
        RequesterNameSnapshot = requesterName,
        RequesterPhoneSnapshot = reporter?.Phone,
        RequesterEmailSnapshot = reporter?.Email,
        RequesterOrganizationSnapshot = reporter?.Organization,
        RequesterLineDisplayNameSnapshot = reporter?.LineDisplayName
    };
}
