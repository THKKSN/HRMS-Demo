using Hrms.Application.Common.Models;

namespace Hrms.Application.Common.Interfaces;

public interface ILineAuthService
{
    Task<LineProfile> VerifyAccessTokenAsync(string accessToken, CancellationToken ct);
}
