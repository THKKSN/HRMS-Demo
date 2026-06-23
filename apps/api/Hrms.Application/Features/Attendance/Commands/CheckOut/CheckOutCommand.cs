using Hrms.Application.Features.Attendance.Dtos;
using MediatR;

namespace Hrms.Application.Features.Attendance.Commands.CheckOut;

public record CheckOutCommand(
    double? Latitude,
    double? Longitude,
    string? SelfieUrl) : IRequest<AttendanceTodayDto>;
