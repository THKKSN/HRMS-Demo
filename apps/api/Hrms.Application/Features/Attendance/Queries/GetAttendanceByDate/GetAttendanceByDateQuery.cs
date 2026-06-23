using Hrms.Application.Features.Attendance.Dtos;
using MediatR;

namespace Hrms.Application.Features.Attendance.Queries.GetAttendanceByDate;

public record GetAttendanceByDateQuery(DateOnly Date) : IRequest<List<AttendanceRecordDto>>;
