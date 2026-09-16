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
    string? Organization,
    string? PhoneCountry = null)
{
    public static ExternalReporterProfileDto From(ExternalReporter reporter) => new(
        reporter.Id,
        reporter.LineDisplayName,
        reporter.PictureUrl,
        reporter.FullName,
        reporter.Phone,
        reporter.Email,
        reporter.Organization,
        reporter.PhoneCountry);
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
    string Organization,
    string PhoneCountry) : IRequest<ExternalReporterProfileDto>;

public sealed class UpdateExternalReporterProfileCommandValidator
    : AbstractValidator<UpdateExternalReporterProfileCommand>
{
    // E.164: + ตามด้วยรหัสประเทศที่ไม่ขึ้นต้นด้วย 0 รวม 7-15 หลัก (ฝั่ง client ประกอบให้แล้วด้วย toE164)
    public UpdateExternalReporterProfileCommandValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Phone)
            .NotEmpty()
            .Must(phone => IsE164(NormalizePhone(phone)))
            .WithMessage("Phone must be in E.164 format (e.g. +66812345678).");
        RuleFor(x => x.PhoneCountry)
            .NotEmpty()
            .Must(IsIsoCountry)
            .WithMessage("PhoneCountry must be an ISO 3166-1 alpha-2 code (e.g. TH).");
        RuleFor(x => x.Email).NotEmpty().MaximumLength(320).EmailAddress();
        RuleFor(x => x.Organization).NotEmpty().MaximumLength(200);
    }

    /// <summary>ลบเว้นวรรค/ขีด/วงเล็บที่อาจพิมพ์ติดมา เหลือเฉพาะ + นำหน้ากับตัวเลข</summary>
    internal static string NormalizePhone(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone)) return string.Empty;
        var trimmed = phone.Trim();
        var digits = new string(trimmed.Where(char.IsDigit).ToArray());
        return trimmed.StartsWith('+') ? $"+{digits}" : digits;
    }

    /// <summary>E.164: '+' ตามด้วยรหัสประเทศที่ไม่ขึ้นต้นด้วย 0 รวมตัวเลข 7-15 หลัก</summary>
    internal static bool IsE164(string value)
        => value.Length is >= 8 and <= 16
            && value[0] == '+'
            && value[1] is >= '1' and <= '9'
            && value.Skip(1).All(char.IsDigit);

    internal static bool IsIsoCountry(string? country)
    {
        var value = country?.Trim();
        return value?.Length == 2 && value.All(char.IsAsciiLetter);
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
        // เก็บเบอร์เป็น E.164 ล้วนเสมอ (ไม่มีเว้นวรรค/ขีด) เพื่อให้ค้นหา โทรกลับ และเทียบซ้ำได้ตรงกันทุกประเทศ
        reporter.Phone = UpdateExternalReporterProfileCommandValidator.NormalizePhone(request.Phone);
        reporter.PhoneCountry = request.PhoneCountry.Trim().ToUpperInvariant();
        reporter.Email = request.Email.Trim().ToLowerInvariant();
        reporter.Organization = request.Organization.Trim();

        await db.SaveChangesAsync(ct);
        return ExternalReporterProfileDto.From(reporter);
    }
}
