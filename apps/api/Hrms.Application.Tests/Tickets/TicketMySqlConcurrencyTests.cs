using FluentAssertions;
using Hrms.Application.Tests.Support;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using Hrms.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Tests.Tickets;

public class TicketMySqlConcurrencyTests
{
    [MySqlFact]
    public async Task TwoWritersForSameTicket_SecondWriterShouldFail()
    {
        var connectionString = Environment.GetEnvironmentVariable("HRMS_MYSQL_TEST_CONNECTION")!;
        var options = new DbContextOptionsBuilder<HrmsDbContext>()
            .UseMySql(connectionString, new MySqlServerVersion(new Version(8, 0, 0)))
            .UseSnakeCaseNamingConvention()
            .Options;

        Guid ticketId;
        await using (var setup = new HrmsDbContext(options))
        {
            var template = await setup.Tickets.AsNoTracking().FirstAsync();
            var ticket = new Ticket
            {
                TicketNo = $"TK-CONC-{Guid.NewGuid():N}"[..28],
                RequestType = TicketRequestType.Internal,
                RequesterEmployeeId = template.RequesterEmployeeId,
                SourceCompanyId = template.SourceCompanyId,
                SourceDepartmentId = template.SourceDepartmentId,
                TargetCompanyId = template.TargetCompanyId,
                TargetDepartmentId = template.TargetDepartmentId,
                CategoryId = template.CategoryId,
                TopicId = template.TopicId,
                Title = "MySQL concurrency test",
                Detail = "Created by TicketMySqlConcurrencyTests",
                Priority = TicketPriority.Medium,
                Status = TicketStatus.Open
            };
            setup.Tickets.Add(ticket);
            await setup.SaveChangesAsync();
            ticketId = ticket.Id;
        }

        try
        {
            await using var firstContext = new HrmsDbContext(options);
            await using var secondContext = new HrmsDbContext(options);
            var first = await firstContext.Tickets.SingleAsync(x => x.Id == ticketId);
            var second = await secondContext.Tickets.SingleAsync(x => x.Id == ticketId);

            first.ContactNote = "first writer";
            second.ContactNote = "second writer";

            await firstContext.SaveChangesAsync();
            var saveSecond = () => secondContext.SaveChangesAsync();

            await saveSecond.Should().ThrowAsync<DbUpdateConcurrencyException>();

            await using var verification = new HrmsDbContext(options);
            var saved = await verification.Tickets.AsNoTracking().SingleAsync(x => x.Id == ticketId);
            saved.ContactNote.Should().Be("first writer");
            saved.Version.Should().Be(2);
        }
        finally
        {
            await using var cleanup = new HrmsDbContext(options);
            await cleanup.Tickets.Where(x => x.Id == ticketId).ExecuteDeleteAsync();
        }
    }
}
