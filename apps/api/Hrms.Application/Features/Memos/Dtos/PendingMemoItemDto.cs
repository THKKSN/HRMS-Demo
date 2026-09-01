using Hrms.Domain.Enums;

namespace Hrms.Application.Features.Memos.Dtos;

public record PendingMemoItemDto(
    Guid Id,
    string MemoNo,
    string MemoTypeName,
    string MemoCategoryNameSnapshot,
    string MemoSubCategoryNameSnapshot,
    string Detail,
    Guid RequesterId,
    string RequesterName,
    string CompanyName,
    string DepartmentName,
    MemoStatus Status,
    DateTime CreatedAt);
