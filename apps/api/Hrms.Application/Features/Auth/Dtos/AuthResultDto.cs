using Hrms.Application.Common.Models;

namespace Hrms.Application.Features.Auth.Dtos;

public record AuthResultDto(
    string AccessToken,
    string RefreshToken,
    int ExpiresIn,
    AuthEmployeeDto Employee);

public record AuthEmployeeDto(
    Guid Id,
    string EmployeeCode,
    string FullName,
    string? AvatarUrl,
    Guid CompanyId,
    IReadOnlyList<RoleClaim> Roles);
