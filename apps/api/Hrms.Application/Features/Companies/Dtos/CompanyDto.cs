namespace Hrms.Application.Features.Companies.Dtos;

public record CompanyDto(
    Guid Id,
    string Name,
    string? NameEn,
    string OrgType,
    Guid? ParentId,
    string? ParentName,
    bool IsActive);

public record CompanyTreeDto(
    Guid Id,
    string Name,
    string? NameEn,
    string OrgType,
    bool IsActive,
    List<CompanyTreeDto> Children);
