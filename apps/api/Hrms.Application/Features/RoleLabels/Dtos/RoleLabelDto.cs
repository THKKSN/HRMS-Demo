namespace Hrms.Application.Features.RoleLabels.Dtos;

public record RoleLabelDto(Guid Id, Guid CompanyId, string Name, bool IsActive, string? NameEn = null, string? NameId = null);
