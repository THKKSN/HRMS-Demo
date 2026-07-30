using Hrms.Domain.Enums;
using MediatR;

namespace Hrms.Application.Features.Attendance.Commands.HrCreateAttendanceRecord;

public record HrCreateAttendanceRecordCommand(
    Guid EmployeeId,
    DateOnly Date,
    DateTime? CheckInTime,
    DateTime? CheckOutTime,
    bool IsLate,
    int LateMinutes,
    AttendanceStatus Status,
    string? Remark) : IRequest<Guid>;
