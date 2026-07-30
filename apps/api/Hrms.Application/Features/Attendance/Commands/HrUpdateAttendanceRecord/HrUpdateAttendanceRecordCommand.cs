using Hrms.Domain.Enums;
using MediatR;

namespace Hrms.Application.Features.Attendance.Commands.HrUpdateAttendanceRecord;

public record HrUpdateAttendanceRecordCommand(
    Guid Id,
    DateTime? CheckInTime,
    DateTime? CheckOutTime,
    bool IsLate,
    int LateMinutes,
    AttendanceStatus Status,
    string? Remark) : IRequest;
