using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<Company>      Companies      { get; } // table: companies
    DbSet<Department>   Departments    { get; } // table: departments
    DbSet<Employee>     Employees      { get; } // table: employees
    DbSet<EmployeeRole> EmployeeRoles  { get; } // table: employee_roles
    DbSet<LeaveType>    LeaveTypes     { get; } // table: leave_types
    DbSet<LeaveRequest> LeaveRequests  { get; } // table: leave_requests
    DbSet<LeaveBalance> LeaveBalances  { get; } // table: leave_balances
    DbSet<AttendanceLog> AttendanceLogs { get; } // table: attendance_logs
    DbSet<RefreshToken> RefreshTokens  { get; } // table: refresh_tokens
    DbSet<LoginHistory> LoginHistories { get; } // table: login_histories

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
