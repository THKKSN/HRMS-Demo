using Hrms.Domain.Entities;
using Hrms.Domain.Enums;

namespace Hrms.Application.Features.Tickets;

public sealed class TicketRequesterResolver : ITicketRequesterResolver
{
    public TicketRequesterContext FromEmployee(Employee employee) => new(
        TicketRequestType.Internal,
        employee.Id,
        null,
        FullName(employee.FirstName, employee.LastName),
        employee.LineUserId,
        employee.Phone,
        employee.Email,
        employee.Company?.Name);

    public TicketRequesterContext FromExternalReporter(ExternalReporter reporter) => new(
        TicketRequestType.External,
        null,
        reporter.Id,
        FirstNonBlank(reporter.FullName, reporter.LineDisplayName, "External requester"),
        reporter.LineUserId,
        reporter.Phone,
        reporter.Email,
        reporter.Organization);

    public TicketRequesterContext FromTicket(Ticket ticket)
    {
        if (ticket.RequestType == TicketRequestType.External)
        {
            var reporter = ticket.ExternalReporter;
            return new TicketRequesterContext(
                TicketRequestType.External,
                null,
                ticket.ExternalReporterId,
                FirstNonBlank(
                    ticket.RequesterNameSnapshot,
                    reporter?.FullName,
                    ticket.RequesterLineDisplayNameSnapshot,
                    reporter?.LineDisplayName,
                    "External requester"),
                reporter?.LineUserId,
                ticket.RequesterPhoneSnapshot ?? reporter?.Phone,
                ticket.RequesterEmailSnapshot ?? reporter?.Email,
                ticket.RequesterOrganizationSnapshot ?? reporter?.Organization);
        }

        var employee = ticket.RequesterEmployee;
        return new TicketRequesterContext(
            TicketRequestType.Internal,
            ticket.RequesterEmployeeId,
            null,
            FirstNonBlank(
                ticket.RequesterNameSnapshot,
                employee is null ? null : FullName(employee.FirstName, employee.LastName),
                "Employee requester"),
            employee?.LineUserId,
            ticket.RequesterPhoneSnapshot ?? employee?.Phone,
            ticket.RequesterEmailSnapshot ?? employee?.Email,
            ticket.RequesterOrganizationSnapshot ?? employee?.Company?.Name);
    }

    private static string FullName(string firstName, string lastName)
        => $"{firstName} {lastName}".Trim();

    private static string FirstNonBlank(params string?[] values)
        => values.First(value => !string.IsNullOrWhiteSpace(value))!.Trim();
}
