using Hrms.Domain.Enums;

namespace Hrms.Application.Common.Interfaces;

public record TicketRoutingCandidate(
    Guid ResponsibilityId,
    Guid EmployeeId,
    string EmployeeName,
    string? LineUserId);

public record TicketRoutingResult(
    TicketRoutingLevel Level,
    TicketRoutingMode Mode,
    TicketRoutingOutcome Outcome,
    IReadOnlyList<TicketRoutingCandidate> Candidates);

public interface ITicketRoutingService
{
    Task<TicketRoutingResult> ResolveAsync(
        Guid companyId,
        Guid departmentId,
        Guid categoryId,
        Guid topicId,
        DateOnly at,
        CancellationToken ct = default);
}
