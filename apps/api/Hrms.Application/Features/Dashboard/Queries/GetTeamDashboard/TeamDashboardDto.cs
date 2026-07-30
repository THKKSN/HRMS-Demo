namespace Hrms.Application.Features.Dashboard.Queries.GetTeamDashboard;

public record TeamDashboardDto(
    int TeamSize,
    int PendingApprovalCount,
    TeamTodayStatsDto TodayStats,
    IReadOnlyList<TeamMemberItem> TodayAbsent,
    IReadOnlyList<TeamLateItem> TodayLate,
    IReadOnlyList<TeamOnLeaveItem> OnLeaveToday,
    IReadOnlyList<TeamPendingApprovalItem> PendingApprovals);

public record TeamTodayStatsDto(int Present, int Late, int Absent, int OnLeave, int NotRecorded);

public record TeamMemberItem(string EmployeeId, string EmployeeName);

public record TeamLateItem(string EmployeeId, string EmployeeName, int LateMinutes);

public record TeamOnLeaveItem(string EmployeeId, string EmployeeName, string LeaveTypeName);

public record TeamPendingApprovalItem(
    string Id,
    string EmployeeName,
    string LeaveTypeName,
    string DateFrom,
    string DateTo,
    decimal TotalDays);
