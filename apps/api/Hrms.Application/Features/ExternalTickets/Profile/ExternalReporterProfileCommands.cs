using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.ExternalTickets.Profile;

public sealed record ExternalReporterProfileDto(
    Guid Id,
    string LineDisplayName,
    string? PictureUrl,
    string? FullName,
    string? Phone,
    string? Email,
    string? Organization)
{
    public static ExternalReporterProfileDto From(ExternalReporter reporter) => new(
        reporter.Id,
        reporter.LineDisplayName,
        reporter.PictureUrl,
        reporter.FullName,
        reporter.Phone,
        reporter.Email,
        reporter.Organization);
}

public sealed record GetExternalReporterProfileQuery : IRequest<ExternalReporterProfileDto>;

public sealed class GetExternalReporterProfileHandler(
    IApplicationDbContext db,
    IExternalCurrentUser currentUser)
    : IRequestHandler<GetExternalReporterProfileQuery, ExternalReporterProfileDto>
{
    public async Task<ExternalReporterProfileDto> Handle(
        GetExternalReporterProfileQuery request,
        CancellationToken ct)
    {
        var reporterId = currentUser.ExternalReporterId
            ?? throw new AppUnauthorizedException("EXTERNAL_UNAUTHENTICATED");
        var reporter = await db.ExternalReporters.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == reporterId && x.IsActive, ct)
            ?? throw new AppUnauthorizedException("EXTERNAL_REPORTER_INACTIVE");
        return ExternalReporterProfileDto.From(reporter);
    }
}

public sealed record UpdateExternalReporterProfileCommand(
    string FullName,
    string Phone,
    string Email,
    string Organization) : IRequest<ExternalReporterProfileDto>;

public sealed class UpdateExternalReporterProfileCommandValidator
    : AbstractValidator<UpdateExternalReporterProfileCommand>
{
    public UpdateExternalReporterProfileCommandValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Phone)
            .NotEmpty()
            .Must(phone =>
            {
                var value = phone.Trim();
                return value.Length is >= 8 and <= 20 &&
                    value.All(ch => char.IsDigit(ch) || ch is '+' or '-' or '(' or ')' or ' ');
            })
            .WithMessage("Phone must contain 8-20 valid characters.");
        RuleFor(x => x.Email).NotEmpty().MaximumLength(320).EmailAddress();
        RuleFor(x => x.Organization).NotEmpty().MaximumLength(200);
    }
}

public sealed class UpdateExternalReporterProfileHandler(
    IApplicationDbContext db,
    IExternalCurrentUser currentUser)
    : IRequestHandler<UpdateExternalReporterProfileCommand, ExternalReporterProfileDto>
{
    public async Task<ExternalReporterProfileDto> Handle(
        UpdateExternalReporterProfileCommand request,
        CancellationToken ct)
    {
        var reporterId = currentUser.ExternalReporterId
            ?? throw new AppUnauthorizedException("EXTERNAL_UNAUTHENTICATED");
        var reporter = await db.ExternalReporters
            .SingleOrDefaultAsync(x => x.Id == reporterId && x.IsActive, ct)
            ?? throw new AppUnauthorizedException("EXTERNAL_REPORTER_INACTIVE");

        reporter.FullName = request.FullName.Trim();
        reporter.Phone = request.Phone.Trim();
        reporter.Email = request.Email.Trim().ToLowerInvariant();
        reporter.Organization = request.Organization.Trim();

        await db.SaveChangesAsync(ct);
        return ExternalReporterProfileDto.From(reporter);
    }
}
