using Hrms.Application.Features.Reports.Dtos;
using MediatR;

namespace Hrms.Application.Features.Reports.Queries.GetAttendanceDailySummary;

public record GetAttendanceDailySummaryQuery(DateOnly? Date) : IRequest<AttendanceDailySummaryDto>;
