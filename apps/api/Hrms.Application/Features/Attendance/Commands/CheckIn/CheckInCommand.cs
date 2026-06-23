using FluentValidation;
using Hrms.Application.Features.Attendance.Dtos;
using MediatR;

namespace Hrms.Application.Features.Attendance.Commands.CheckIn;

public record CheckInCommand(
    Guid LocationId,
    double Latitude,
    double Longitude,
    string? SelfieUrl) : IRequest<AttendanceTodayDto>;

public class CheckInCommandValidator : AbstractValidator<CheckInCommand>
{
    public CheckInCommandValidator()
    {
        RuleFor(x => x.LocationId).NotEmpty();

        RuleFor(x => x.Latitude)
            .InclusiveBetween(-90, 90)
            .WithMessage("Latitude ต้องอยู่ระหว่าง -90 ถึง 90");

        RuleFor(x => x.Longitude)
            .InclusiveBetween(-180, 180)
            .WithMessage("Longitude ต้องอยู่ระหว่าง -180 ถึง 180");
    }
}
