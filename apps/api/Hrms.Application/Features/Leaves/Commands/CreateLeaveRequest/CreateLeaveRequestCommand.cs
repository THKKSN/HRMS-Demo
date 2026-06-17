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
    string? Reason,
    string? AttachmentUrl) : IRequest<LeaveRequestDto>;

public class CreateLeaveRequestCommandValidator : AbstractValidator<CreateLeaveRequestCommand>
{
    public CreateLeaveRequestCommandValidator()
    {
        RuleFor(x => x.LeaveTypeId).NotEmpty();

        RuleFor(x => x.DateFrom)
            .Must(d => d >= DateOnly.FromDateTime(DateTime.Today))
            .WithMessage("ไม่สามารถลาย้อนหลังได้");

        RuleFor(x => x.DateTo)
            .GreaterThanOrEqualTo(x => x.DateFrom)
            .WithMessage("DateTo ต้องไม่น้อยกว่า DateFrom");

        RuleFor(x => x)
            .Must(x => x.HalfDay == HalfDayType.Full || x.DateFrom == x.DateTo)
            .WithMessage("การลาครึ่งวันต้องเป็นวันเดียวกัน (DateFrom == DateTo)")
            .OverridePropertyName(nameof(CreateLeaveRequestCommand.HalfDay));

        RuleFor(x => x.Reason).MaximumLength(500);
    }
}
