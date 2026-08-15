using Hrms.Domain.Entities;

namespace Hrms.Application.Common.Interfaces;

public interface IExternalTokenService
{
    (string token, DateTime expiresAt) GenerateAccessToken(ExternalReporter reporter);
}
