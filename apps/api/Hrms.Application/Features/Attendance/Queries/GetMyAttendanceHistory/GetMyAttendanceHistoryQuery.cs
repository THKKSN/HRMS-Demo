using Hrms.Application.Common.Models;
using Hrms.Application.Features.Attendance.Dtos;
using MediatR;

namespace Hrms.Application.Features.Attendance.Queries.GetMyAttendanceHistory;

public record GetMyAttendanceHistoryQuery(
    DateOnly From,
    DateOnly To,
    int Page,
    int PageSize) : IRequest<PagedResult<AttendanceRecordDto>>;
