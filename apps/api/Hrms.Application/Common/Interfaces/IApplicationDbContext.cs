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
    DbSet<AttendanceRecord> AttendanceRecords { get; } // table: attendance_records
    DbSet<Shift>            Shifts            { get; } // table: shifts
    DbSet<Holiday>                 Holidays                 { get; } // table: holidays
    DbSet<WeeklyHolidaySchedule>  WeeklyHolidaySchedules   { get; } // table: weekly_holiday_schedules
    DbSet<RefreshToken> RefreshTokens  { get; } // table: refresh_tokens
    DbSet<LoginHistory> LoginHistories { get; } // table: login_histories

    DbSet<Location>     Locations      { get; } // table: locations
    DbSet<RoleLabel>    RoleLabels     { get; } // table: role_labels

    // Address reference data — read-only, imported directly to DB
    DbSet<Province>    Provinces    { get; }
    DbSet<District>    Districts    { get; }
    DbSet<SubDistrict> SubDistricts { get; }
    DbSet<ZipCode>     ZipCodes     { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
