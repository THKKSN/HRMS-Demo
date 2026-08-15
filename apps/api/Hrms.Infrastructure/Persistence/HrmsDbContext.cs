using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Infrastructure.Persistence;

public class HrmsDbContext(DbContextOptions<HrmsDbContext> options) : DbContext(options), IApplicationDbContext
{
    public DbSet<Company> Companies => Set<Company>();
    public DbSet<Department> Departments => Set<Department>();
    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<SystemRole> SystemRoles => Set<SystemRole>();
    public DbSet<EmployeeRole> EmployeeRoles => Set<EmployeeRole>();
    public DbSet<LeaveType> LeaveTypes => Set<LeaveType>();
    public DbSet<LeaveRequest> LeaveRequests => Set<LeaveRequest>();
    public DbSet<AttendanceRecord> AttendanceRecords => Set<AttendanceRecord>();
    public DbSet<Shift>            Shifts            => Set<Shift>();
    public DbSet<AttendancePolicy> AttendancePolicies => Set<AttendancePolicy>();
    public DbSet<Holiday>                Holidays                => Set<Holiday>();
    public DbSet<WeeklyHolidaySchedule>  WeeklyHolidaySchedules  => Set<WeeklyHolidaySchedule>();
    public DbSet<LeaveBalance> LeaveBalances => Set<LeaveBalance>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<LoginHistory> LoginHistories => Set<LoginHistory>();

    public DbSet<Permission>      Permissions     => Set<Permission>();
    public DbSet<RolePermission>  RolePermissions => Set<RolePermission>();
    public DbSet<AuditLog>        AuditLogs       => Set<AuditLog>();

    public DbSet<OtRequest>             OtRequests             => Set<OtRequest>();
    public DbSet<ExpenseClaim>          ExpenseClaims          => Set<ExpenseClaim>();
    public DbSet<ExpenseOcrResult>       ExpenseOcrResults      => Set<ExpenseOcrResult>();
    public DbSet<ExpenseBillingBatch>    ExpenseBillingBatches  => Set<ExpenseBillingBatch>();
    public DbSet<ExpenseBillingBatchItem> ExpenseBillingBatchItems => Set<ExpenseBillingBatchItem>();
    public DbSet<EmployeeShiftOverride> EmployeeShiftOverrides => Set<EmployeeShiftOverride>();

    public DbSet<Location>    Locations    => Set<Location>();
    public DbSet<RoleLabel>   RoleLabels   => Set<RoleLabel>();
    public DbSet<Ticket>           Tickets           => Set<Ticket>();
    public DbSet<TicketCategory>   TicketCategories  => Set<TicketCategory>();
    public DbSet<TicketTopic>      TicketTopics      => Set<TicketTopic>();
    public DbSet<TicketSubject>    TicketSubjects    => Set<TicketSubject>();
    public DbSet<TicketAttachment> TicketAttachments => Set<TicketAttachment>();
    public DbSet<TicketPendingUpload> TicketPendingUploads => Set<TicketPendingUpload>();
    public DbSet<TicketDailySequence> TicketDailySequences => Set<TicketDailySequence>();
    public DbSet<TicketAssignment> TicketAssignments => Set<TicketAssignment>();
    public DbSet<TicketComment>    TicketComments    => Set<TicketComment>();
    public DbSet<TicketReview>     TicketReviews     => Set<TicketReview>();
    public DbSet<TicketStatusHistory> TicketStatusHistory => Set<TicketStatusHistory>();
    public DbSet<TicketCancellationRequest> TicketCancellationRequests => Set<TicketCancellationRequest>();
    public DbSet<TicketProgressEntry> TicketProgressEntries => Set<TicketProgressEntry>();
    public DbSet<TicketWorkflowDefinition> TicketWorkflowDefinitions => Set<TicketWorkflowDefinition>();
    public DbSet<TicketSubjectGuidanceConfig> TicketSubjectGuidanceConfigs => Set<TicketSubjectGuidanceConfig>();
    public DbSet<EmployeeResponsibility> EmployeeResponsibilities => Set<EmployeeResponsibility>();
    public DbSet<NotificationOutbox> NotificationOutboxes => Set<NotificationOutbox>();

    // Address reference data — read-only, imported directly to DB (no migrations)
    public DbSet<Province>    Provinces    => Set<Province>();
    public DbSet<District>    Districts    => Set<District>();
    public DbSet<SubDistrict> SubDistricts => Set<SubDistrict>();
    public DbSet<ZipCode>     ZipCodes     => Set<ZipCode>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(HrmsDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        foreach (var entry in ChangeTracker.Entries<Domain.Common.BaseEntity>())
        {
            if (entry.State == EntityState.Modified)
                entry.Entity.UpdatedAt = DateTime.UtcNow.AddHours(7);
        }

        foreach (var entry in ChangeTracker.Entries<Ticket>())
        {
            if (entry.State == EntityState.Modified)
                entry.Entity.Version = entry.Property(x => x.Version).OriginalValue + 1;
        }

        return base.SaveChangesAsync(cancellationToken);
    }

    public async Task ExecuteInTransactionAsync(
        Func<CancellationToken, Task> action,
        CancellationToken cancellationToken = default)
    {
        var strategy = Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await Database.BeginTransactionAsync(cancellationToken);
            await action(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        });
    }
}
