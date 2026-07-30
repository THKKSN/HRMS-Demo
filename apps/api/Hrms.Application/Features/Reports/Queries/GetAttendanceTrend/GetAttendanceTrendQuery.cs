using Hrms.Application.Features.Reports.Dtos;
using MediatR;

namespace Hrms.Application.Features.Reports.Queries.GetAttendanceTrend;

public record GetAttendanceTrendQuery(
    DateOnly? DateFrom,
    DateOnly? DateTo) : IRequest<IReadOnlyList<AttendanceTrendItemDto>>;
