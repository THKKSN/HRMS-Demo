using Hrms.Application.Features.AuditLogs.Dtos;

namespace Hrms.Application.Features.Dashboard.Queries.GetAdminDashboard;

public record AdminDashboardDto(
    int TotalCompanies,
    int TotalDepartments,
    int TotalEmployees,
    int ActiveEmployees,
    IReadOnlyList<AuditLogDto> RecentAuditLogs);
