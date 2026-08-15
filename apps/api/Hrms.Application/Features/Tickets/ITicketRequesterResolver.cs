using Hrms.Domain.Entities;

namespace Hrms.Application.Features.Tickets;

public interface ITicketRequesterResolver
{
    TicketRequesterContext FromEmployee(Employee employee);
    TicketRequesterContext FromExternalReporter(ExternalReporter reporter);
    TicketRequesterContext FromTicket(Ticket ticket);
}
