namespace Hrms.Application.Features.Permissions.Dtos;

public record PermissionDto(
    Guid   Id,
    string Code,
    string Module,
    string Action,
    string Description,
    bool   IsSystem
);

public record RolePermissionSummaryDto(
    Guid                  RoleId,
    string                Role,
    string                RoleName,
    IReadOnlyList<string> PermissionCodes
);
