using Hrms.Application.Features.Reports.Dtos;
using MediatR;

namespace Hrms.Application.Features.Reports.Queries.GetAttendanceMonthlySummary;

public record GetAttendanceMonthlySummaryQuery(
    int Year,
    int Month,
    Guid? DepartmentId) : IRequest<IReadOnlyList<AttendanceMonthlySummaryDto>>;
