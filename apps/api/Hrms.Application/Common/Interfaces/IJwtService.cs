using Hrms.Domain.Entities;

namespace Hrms.Application.Common.Interfaces;

public interface IJwtService
{
    (string token, DateTime expiresAt) GenerateAccessToken(Employee employee, IEnumerable<EmployeeRole> roles);
    (string token, string hash, DateTime expiresAt) GenerateRefreshToken();
    string HashToken(string token);
}
