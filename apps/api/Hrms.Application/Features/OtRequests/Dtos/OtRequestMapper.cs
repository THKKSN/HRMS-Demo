using Hrms.Domain.Entities;

namespace Hrms.Application.Features.OtRequests.Dtos;

internal static class OtRequestMapper
{
    internal static OtRequestDto ToDto(OtRequest ot, string? departmentName, string? supervisorName, string? hrName) =>
        new(
            ot.Id,
            ot.EmployeeId,
            $"{ot.Employee.FirstName} {ot.Employee.LastName}".Trim(),
            departmentName,
            ot.Date,
            ot.StartTime,
            ot.EndTime,
            ot.TotalHours,
            ot.RateType,
            ot.Reason,
            ot.Status,
            supervisorName,
            ot.SupervisorComment,
            ot.SupervisorApprovedAt,
            hrName,
            ot.HrComment,
            ot.HrAcknowledgedAt,
            ot.CreatedAt);
}
