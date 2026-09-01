namespace Hrms.Application.Features.Memos.Dtos;

public record MemoSubCategoryDto(Guid Id, Guid MemoCategoryId, string Name, bool IsActive);
