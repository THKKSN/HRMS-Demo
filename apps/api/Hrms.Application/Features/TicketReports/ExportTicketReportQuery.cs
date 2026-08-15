using MediatR;

namespace Hrms.Application.Features.TicketReports;

public record ExportTicketReportQuery(TicketReportFilter Filter) : IRequest<TicketReportExportResult>;
