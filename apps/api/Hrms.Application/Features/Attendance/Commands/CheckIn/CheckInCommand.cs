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
            .WithErrorCode("LATITUDE_OUT_OF_RANGE").WithMessage("Latitude must be between -90 and 90.");

        RuleFor(x => x.Longitude)
            .InclusiveBetween(-180, 180)
            .WithErrorCode("LONGITUDE_OUT_OF_RANGE").WithMessage("Longitude must be between -180 and 180.");
    }
}
