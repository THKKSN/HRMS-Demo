using Hrms.Application.Common.Models;

namespace Hrms.Application.Common.Interfaces;

public interface IPiswinEmployeeClient
{
    Task<PiswinEmployee> FindByNationalIdAsync(string nationalId, CancellationToken ct = default);
}
