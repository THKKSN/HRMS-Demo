using MediatR;

namespace Hrms.Application.Features.LeaveBalances.Commands.RecalcLeaveBalances;

public record RecalcLeaveBalancesCommand(int Year, Guid? CompanyId, Guid? EmployeeId = null) : IRequest<int>;
