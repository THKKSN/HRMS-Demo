namespace Hrms.Application.Features.Memos.Dtos;

public record MemoCategoryDto(Guid Id, Guid MemoTypeId, string Name, bool IsActive);
