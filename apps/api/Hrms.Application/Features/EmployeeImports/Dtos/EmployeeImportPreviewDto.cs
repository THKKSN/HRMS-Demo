namespace Hrms.Application.Features.EmployeeImports.Dtos;

public sealed record EmployeeImportPreviewDto(
    string EmployeeCode,
    string FirstName,
    string LastName,
    string NationalIdMasked,
    DateOnly? HireDate,
    bool IsActive,
    bool AlreadyImported);
