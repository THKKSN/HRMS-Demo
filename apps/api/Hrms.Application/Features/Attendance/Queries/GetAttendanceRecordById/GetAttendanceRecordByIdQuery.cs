using Hrms.Application.Features.Attendance.Dtos;
using MediatR;

namespace Hrms.Application.Features.Attendance.Queries.GetAttendanceRecordById;

public record GetAttendanceRecordByIdQuery(Guid Id) : IRequest<AttendanceRecordHrDto>;
