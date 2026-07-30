using FluentAssertions;
using FluentValidation.TestHelper;
using Hrms.Application.Features.Tickets.Commands;
using Hrms.Domain.Enums;

namespace Hrms.Application.Tests.Tickets;

public class TicketValidationTests
{
    [Fact]
    public void Attachment_ShouldRejectFileLargerThanTenMegabytes()
    {
        var validator = new AddTicketAttachmentValidator();
        var command = new AddTicketAttachmentCommand(
            Guid.NewGuid(),
            $"ticket-upload:{Guid.NewGuid()}",
            "evidence.jpg",
            "image/jpeg",
            10 * 1024 * 1024 + 1,
            TicketAttachmentStage.Progress,
            TicketAttachmentVisibility.Public);

        var result = validator.TestValidate(command);

        result.ShouldHaveValidationErrorFor(x => x.SizeBytes);
    }

    [Theory]
    [InlineData("")]
    [InlineData("short")]
    public void Cancellation_ShouldRequireMeaningfulReason(string reason)
    {
        var validator = new RequestTicketCancellationValidator();

        var result = validator.TestValidate(
            new RequestTicketCancellationCommand(Guid.NewGuid(), reason, null));

        result.ShouldHaveValidationErrorFor(x => x.Reason);
    }
}
