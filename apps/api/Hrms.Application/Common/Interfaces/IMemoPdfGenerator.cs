namespace Hrms.Application.Common.Interfaces;

public record MemoPrintData(
    Guid Id,
    string MemoNo,
    string MemoTypeName,
    string CategoryName,
    string SubCategoryName,
    string Detail,
    string RequesterName,
    string CompanyName,
    string DepartmentName,
    DateTime CreatedAt,
    DateTime ApprovedAt,
    string ApprovedByName,
    string? ApproveComment = null);

public interface IMemoPdfGenerator
{
    byte[] Generate(MemoPrintData data);
}
