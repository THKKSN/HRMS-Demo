using Hrms.Domain.Enums;

namespace Hrms.Application.Features.Dashboard.Queries.GetMyDashboard;

public record MyDashboardDto(
    MyTodayAttendanceDto? TodayAttendance,
    IReadOnlyList<MyLeaveBalanceItem> LeaveBalance,
    int PendingLeaveCount,
    MyMonthStatsDto MonthStats);

public record MyTodayAttendanceDto(
    Guid? Id,
    string Date,
    string? CheckInTime,
    string? CheckOutTime,
    AttendanceStatus? Status,
    bool IsLate,
    int LateMinutes);

public record MyLeaveBalanceItem(
    string LeaveTypeName,
    decimal RemainingDays,
    decimal TotalDays,
    decimal PendingDays);

public record MyMonthStatsDto(
    int PresentDays,
    int LateDays,
    int AbsentDays,
    int LeaveDays,
    int WorkingDays);
