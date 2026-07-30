namespace Hrms.Application.Features.Dashboard.Queries.GetAdminDashboard;

public record AdminDashboardDto(
    int TotalCompanies,
    int TotalDepartments,
    int TotalEmployees,
    int ActiveEmployees,
    IReadOnlyList<AdminAuditLogItem> RecentAuditLogs);

public record AdminAuditLogItem(
    string Id,
    string Module,
    string Action,
    string Description,
    string? PerformedByName,
    string PerformedAt);
