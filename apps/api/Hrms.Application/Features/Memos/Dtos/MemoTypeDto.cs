namespace Hrms.Application.Features.Memos.Dtos;

public record MemoTypeDto(
    Guid Id,
    string Name,
    Guid CompanyId,
    string CompanyName,
    Guid DepartmentId,
    string DepartmentName,
    bool IsActive);
