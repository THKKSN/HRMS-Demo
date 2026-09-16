namespace Hrms.Application.Features.Companies.Dtos;

public record CompanyDto(
    Guid Id,
    string Name,
    string? NameEn,
    string OrgType,
    Guid? ParentId,
    string? ParentName,
    bool IsActive,
    bool IsHeadquarters,
    string? NameId = null);

public record CompanyTreeDto(
    Guid Id,
    string Name,
    string? NameEn,
    string OrgType,
    bool IsActive,
    bool IsHeadquarters,
    List<CompanyTreeDto> Children,
    string? NameId = null);
