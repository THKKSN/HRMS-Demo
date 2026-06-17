using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Models;
using Hrms.Application.Common.Options;
using Hrms.Domain.Entities;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Hrms.Infrastructure.Services;

public class JwtService(IOptions<JwtOptions> options) : IJwtService
{
    private readonly JwtOptions _opt = options.Value;

    public (string token, DateTime expiresAt) GenerateAccessToken(
        Employee employee, IEnumerable<EmployeeRole> roles)
    {
        var expiresAt = DateTime.UtcNow.AddMinutes(_opt.AccessTokenExpiryMinutes);

        var roleClaims = roles
            .Where(r => r.IsActive)
            .Select(r => new RoleClaim(r.Role.ToString(), r.CompanyId, r.DepartmentId))
            .ToList();

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, employee.Id.ToString()),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new("line_uid", employee.LineUserId ?? string.Empty),
            new("name", $"{employee.FirstName} {employee.LastName}".Trim()),
            new("company_id", employee.CompanyId.ToString()),
            new("roles", JsonSerializer.Serialize(roleClaims))
        };

        // standard role claims so [Authorize(Roles = "...")] works out of the box
        foreach (var rc in roleClaims.Select(r => r.Role).Distinct())
            claims.Add(new Claim(ClaimTypes.Role, rc));

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_opt.Secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _opt.Issuer,
            audience: _opt.Audience,
            claims: claims,
            expires: expiresAt,
            signingCredentials: creds);

        return (new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
    }

    public (string token, string hash, DateTime expiresAt) GenerateRefreshToken()
    {
        var token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
        var hash = HashToken(token);
        var expiresAt = DateTime.UtcNow.AddDays(_opt.RefreshTokenExpiryDays);
        return (token, hash, expiresAt);
    }

    public string HashToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(bytes);
    }
}
