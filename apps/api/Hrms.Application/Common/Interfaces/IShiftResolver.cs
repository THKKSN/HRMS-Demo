using Hrms.Domain.Entities;

namespace Hrms.Application.Common.Interfaces;

public interface IShiftResolver
{
    /// <summary>
    /// Resolves the effective shift for an employee on a given date.
    /// Priority: Personal Override → Department Shift → Company Default Shift.
    /// </summary>
    Task<Shift?> ResolveAsync(Guid employeeId, DateOnly date, CancellationToken ct = default);
}
