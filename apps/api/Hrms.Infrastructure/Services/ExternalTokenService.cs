using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Options;
using Hrms.Domain.Entities;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Hrms.Infrastructure.Services;

public sealed class ExternalTokenService(IOptions<ExternalJwtOptions> options) : IExternalTokenService
{
    private readonly ExternalJwtOptions _options = options.Value;

    public (string token, DateTime expiresAt) GenerateAccessToken(ExternalReporter reporter)
    {
        if (Encoding.UTF8.GetByteCount(_options.Secret) < 32)
            throw new InvalidOperationException("ExternalJwt secret must be at least 32 bytes.");

        var expiresAt = DateTime.UtcNow.AddMinutes(_options.AccessTokenExpiryMinutes);
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, reporter.Id.ToString()),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new("actor_type", "external"),
            new("external_reporter_id", reporter.Id.ToString()),
            new("line_uid", reporter.LineUserId),
            new("name", reporter.LineDisplayName)
        };
        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.Secret)),
            SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            expires: expiresAt,
            signingCredentials: credentials);
        return (new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
    }
}
