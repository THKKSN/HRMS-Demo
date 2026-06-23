using Hrms.Application.Features.Attendance.Dtos;
using MediatR;

namespace Hrms.Application.Features.Attendance.Queries.GetMyAttendanceToday;

public record GetMyAttendanceTodayQuery : IRequest<AttendanceTodayDto>;
