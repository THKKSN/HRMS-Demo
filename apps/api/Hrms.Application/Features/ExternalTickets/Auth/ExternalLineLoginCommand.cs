using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.ExternalTickets.Profile;
using Hrms.Domain.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.ExternalTickets.Auth;

public sealed record ExternalLineLoginCommand(string AccessToken) : IRequest<ExternalLineLoginResult>;

public sealed class ExternalLineLoginCommandValidator : AbstractValidator<ExternalLineLoginCommand>
{
    public ExternalLineLoginCommandValidator()
    {
        RuleFor(x => x.AccessToken).NotEmpty().MaximumLength(4096);
    }
}

public sealed record ExternalLineLoginResult(
    string AccessToken,
    int ExpiresIn,
    bool LinkedEmployee,
    ExternalReporterProfileDto Reporter);

public sealed class ExternalLineLoginHandler(
    IApplicationDbContext db,
    ILineAuthService line,
    IExternalTokenService tokenService)
    : IRequestHandler<ExternalLineLoginCommand, ExternalLineLoginResult>
{
    public async Task<ExternalLineLoginResult> Handle(ExternalLineLoginCommand request, CancellationToken ct)
    {
        var profile = await line.VerifyAccessTokenAsync(request.AccessToken, ct);

        // เช็คเพื่อน LINE OA เฉพาะเมื่อ Admin เปิด RequireOaFriendship ในการตั้งค่าช่องทางเท่านั้น
        var requireOaFriendship = await db.ExternalTicketConfigurations.AsNoTracking()
            .Where(c => c.TargetCompanyId == Hrms.Domain.Constants.ExternalTicketConstants.TargetCompanyId)
            .Select(c => c.RequireOaFriendship)
            .FirstOrDefaultAsync(ct);
        if (requireOaFriendship && !await line.GetFriendshipStatusAsync(request.AccessToken, ct))
            throw new AppForbiddenException("LINE_OA_FRIEND_REQUIRED");

        var reporter = await db.ExternalReporters
            .SingleOrDefaultAsync(x => x.LineUserId == profile.UserId, ct);
        if (reporter is null)
        {
            reporter = new ExternalReporter
            {
                LineUserId = profile.UserId,
                LineDisplayName = profile.DisplayName,
                PictureUrl = profile.PictureUrl,
                LastLoginAt = DateTime.UtcNow.AddHours(7)
            };
            db.ExternalReporters.Add(reporter);
        }
        else
        {
            if (!reporter.IsActive)
                throw new AppForbiddenException("EXTERNAL_REPORTER_INACTIVE");
            reporter.LineDisplayName = profile.DisplayName;
            reporter.PictureUrl = profile.PictureUrl;
            reporter.LastLoginAt = DateTime.UtcNow.AddHours(7);
        }

        var linkedEmployee = await db.Employees.AsNoTracking()
            .AnyAsync(x => x.LineUserId == profile.UserId && x.IsActive, ct);
        await db.SaveChangesAsync(ct);

        var (accessToken, expiresAt) = tokenService.GenerateAccessToken(reporter);
        var expiresIn = Math.Max(0, (int)Math.Ceiling((expiresAt - DateTime.UtcNow).TotalSeconds));
        return new ExternalLineLoginResult(
            accessToken,
            expiresIn,
            linkedEmployee,
            ExternalReporterProfileDto.From(reporter));
    }
}
