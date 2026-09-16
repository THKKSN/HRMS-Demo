using FluentValidation;
using Hrms.Application.Features.Leaves.Dtos;
using Hrms.Domain.Enums;
using MediatR;

namespace Hrms.Application.Features.Leaves.Commands.CreateLeaveRequest;

public record CreateLeaveRequestCommand(
    Guid LeaveTypeId,
    DateOnly DateFrom,
    DateOnly DateTo,
    HalfDayType HalfDay,
    TimeOnly? TimeFrom,
    TimeOnly? TimeTo,
    string? Reason,
    IReadOnlyList<string>? AttachmentUrls) : IRequest<LeaveRequestDto>;

public class CreateLeaveRequestCommandValidator : AbstractValidator<CreateLeaveRequestCommand>
{
    public CreateLeaveRequestCommandValidator()
    {
        RuleFor(x => x.LeaveTypeId).NotEmpty();

        RuleFor(x => x.DateFrom)
            .Must(d => d >= DateOnly.FromDateTime(DateTime.Today))
            .WithErrorCode("LEAVE_DATE_IN_PAST").WithMessage("Leave cannot be requested for a past date.");

        RuleFor(x => x.DateTo)
            .GreaterThanOrEqualTo(x => x.DateFrom)
            .WithErrorCode("DATE_RANGE_INVALID").WithMessage("The end date must not be earlier than the start date.");

        RuleFor(x => x)
            .Must(x => x.HalfDay == HalfDayType.Full || x.DateFrom == x.DateTo)
            .WithErrorCode("LEAVE_HALF_DAY_SAME_DATE").WithMessage("Half-day leave must start and end on the same date.")
            .OverridePropertyName(nameof(CreateLeaveRequestCommand.HalfDay));

        // ถ้าระบุเวลา ต้องเป็นวันเดียวกันและ TimeTo > TimeFrom
        RuleFor(x => x)
            .Must(x => x.TimeFrom == null || x.DateFrom == x.DateTo)
            .WithErrorCode("LEAVE_HOURLY_SAME_DATE").WithMessage("Hourly leave must start and end on the same date.")
            .OverridePropertyName(nameof(CreateLeaveRequestCommand.TimeFrom));

        RuleFor(x => x)
            .Must(x => x.TimeFrom == null || x.TimeTo == null || x.TimeTo > x.TimeFrom)
            .WithErrorCode("TIME_RANGE_INVALID").WithMessage("The end time must be later than the start time.")
            .OverridePropertyName(nameof(CreateLeaveRequestCommand.TimeTo));

        RuleFor(x => x.Reason).MaximumLength(500);
    }
}
