namespace Hrms.Application.Common.Models;

public sealed record PiswinEmployee(
    string EmployeeCode,
    string FirstName,
    string LastName,
    string NationalId,
    DateOnly? HireDate,
    bool IsActive);
