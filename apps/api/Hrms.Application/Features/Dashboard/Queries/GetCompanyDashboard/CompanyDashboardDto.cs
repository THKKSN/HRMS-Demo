namespace Hrms.Application.Features.Dashboard.Queries.GetCompanyDashboard;

public record CompanyDashboardDto(
    int TotalEmployees,
    CompanyTodayStatsDto TodayStats,
    int PendingLeaveApprovals,
    IReadOnlyList<DeptAbsentItem> TopAbsentDepartments,
    IReadOnlyList<TrendItem> MonthlyTrend,
    bool IsSystemWide,
    Guid? SelectedCompanyId,
    string? SelectedCompanyName);

public record CompanyTodayStatsDto(
    int Present,
    int Late,
    int Absent,
    int OnLeave,
    int NotRecorded,
    decimal AttendanceRate);

public record DeptAbsentItem(string DepartmentName, int AbsentCount);

public record TrendItem(string Date, int Present, int Late, int Absent, int OnLeave);
