using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Infrastructure.Persistence;

public class HrmsDbContext(
    DbContextOptions<HrmsDbContext> options,
    INotificationDispatchSignal? notificationDispatch = null) : DbContext(options), IApplicationDbContext
{
    // ตั้งเป็น true เมื่อมีแถว NotificationOutbox ใหม่ถูกบันทึกภายใน transaction
    // ที่ยังไม่ commit — จะส่งสัญญาณจริงหลัง CommitAsync ใน ExecuteInTransactionAsync
    private bool _pendingNotificationDispatch;


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
    public DbSet<ExternalReporter> ExternalReporters => Set<ExternalReporter>();

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
    public DbSet<ExternalRepairSyncOutbox> ExternalRepairSyncOutboxes => Set<ExternalRepairSyncOutbox>();
    public DbSet<ExternalTicketConfiguration> ExternalTicketConfigurations => Set<ExternalTicketConfiguration>();
    public DbSet<ExternalTicketCategory> ExternalTicketCategories => Set<ExternalTicketCategory>();
    public DbSet<ExternalTicketTopic> ExternalTicketTopics => Set<ExternalTicketTopic>();
    public DbSet<ExternalTicketSubject> ExternalTicketSubjects => Set<ExternalTicketSubject>();

    public DbSet<MemoType> MemoTypes => Set<MemoType>();
    public DbSet<MemoCategory> MemoCategories => Set<MemoCategory>();
    public DbSet<MemoSubCategory> MemoSubCategories => Set<MemoSubCategory>();
    public DbSet<Memo> Memos => Set<Memo>();
    public DbSet<MemoMonthlySequence> MemoMonthlySequences => Set<MemoMonthlySequence>();

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

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await ValidateTicketActorInvariantsAsync(cancellationToken);

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

        var hasNewNotifications = ChangeTracker.Entries<NotificationOutbox>()
            .Any(entry => entry.State == EntityState.Added);

        var affected = await base.SaveChangesAsync(cancellationToken);

        if (hasNewNotifications)
        {
            if (Database.CurrentTransaction is null)
                notificationDispatch?.RequestDispatch();
            else
                _pendingNotificationDispatch = true;
        }

        return affected;
    }

    private async Task ValidateTicketActorInvariantsAsync(CancellationToken cancellationToken)
    {
        foreach (var entry in ChangedEntries<Ticket>())
        {
            var ticket = entry.Entity;
            var hasEmployee = ticket.RequesterEmployeeId.HasValue;
            var hasExternal = ticket.ExternalReporterId.HasValue;
            if (hasEmployee == hasExternal ||
                ticket.RequestType == Domain.Enums.TicketRequestType.Internal && !hasEmployee ||
                ticket.RequestType == Domain.Enums.TicketRequestType.External && !hasExternal)
                throw new InvalidOperationException("TICKET_REQUESTER_EXACTLY_ONE_REQUIRED");

            if (ticket.RequestType == Domain.Enums.TicketRequestType.Internal && !ticket.SourceCompanyId.HasValue)
                throw new InvalidOperationException("INTERNAL_TICKET_SOURCE_COMPANY_REQUIRED");

            if (ticket.RequestType == Domain.Enums.TicketRequestType.External)
            {
                if (ticket.TargetCompanyId != Guid.Parse("c89cb0d1-7548-4c1b-a36a-929f094f0b30"))
                    throw new InvalidOperationException("EXTERNAL_TICKET_TARGET_COMPANY_INVALID");
                if (string.IsNullOrWhiteSpace(ticket.RequesterNameSnapshot) ||
                    string.IsNullOrWhiteSpace(ticket.RequesterPhoneSnapshot) ||
                    string.IsNullOrWhiteSpace(ticket.RequesterEmailSnapshot) ||
                    string.IsNullOrWhiteSpace(ticket.RequesterOrganizationSnapshot))
                    throw new InvalidOperationException("EXTERNAL_TICKET_REQUESTER_SNAPSHOT_REQUIRED");
            }
        }

        var externalTicketActors = new List<(Guid TicketId, Guid ExternalReporterId)>();
        foreach (var entry in ChangedEntries<TicketComment>())
        {
            EnsureExactlyOneActor(entry.Entity.EmployeeId, entry.Entity.ExternalReporterId);
            if (entry.Entity.ExternalReporterId is { } reporterId)
                externalTicketActors.Add((entry.Entity.TicketId, reporterId));
        }
        foreach (var entry in ChangedEntries<TicketAttachment>())
        {
            EnsureExactlyOneActor(entry.Entity.UploadedByEmployeeId, entry.Entity.UploadedByExternalReporterId);
            if (entry.Entity.UploadedByExternalReporterId is { } reporterId)
                externalTicketActors.Add((entry.Entity.TicketId, reporterId));
        }
        foreach (var entry in ChangedEntries<TicketPendingUpload>())
            EnsureExactlyOneActor(entry.Entity.UploadedByEmployeeId, entry.Entity.UploadedByExternalReporterId);
        foreach (var entry in ChangedEntries<TicketCancellationRequest>())
        {
            EnsureExactlyOneActor(entry.Entity.RequestedByEmployeeId, entry.Entity.RequestedByExternalReporterId);
            if (entry.Entity.RequestedByExternalReporterId is { } reporterId)
                externalTicketActors.Add((entry.Entity.TicketId, reporterId));
        }
        foreach (var entry in ChangedEntries<TicketProgressEntry>())
        {
            EnsureExactlyOneActor(entry.Entity.CreatedByEmployeeId, entry.Entity.CreatedByExternalReporterId);
            if (entry.Entity.CreatedByExternalReporterId is { } reporterId)
                externalTicketActors.Add((entry.Entity.TicketId, reporterId));
        }
        foreach (var entry in ChangedEntries<TicketStatusHistory>())
        {
            if (entry.Entity.ChangedByEmployeeId.HasValue && entry.Entity.ChangedByExternalReporterId.HasValue)
                throw new InvalidOperationException("TICKET_ACTOR_EXACTLY_ONE_REQUIRED");
            if (entry.Entity.ChangedByExternalReporterId is { } reporterId)
                externalTicketActors.Add((entry.Entity.TicketId, reporterId));
        }

        foreach (var actor in externalTicketActors.Distinct())
        {
            var trackedTicket = ChangeTracker.Entries<Ticket>()
                .FirstOrDefault(x => x.Entity.Id == actor.TicketId)?.Entity;
            var ownerId = trackedTicket?.ExternalReporterId ?? await Tickets
                .AsNoTracking()
                .Where(x => x.Id == actor.TicketId)
                .Select(x => x.ExternalReporterId)
                .SingleOrDefaultAsync(cancellationToken);
            if (ownerId != actor.ExternalReporterId)
                throw new InvalidOperationException("EXTERNAL_ACTOR_DOES_NOT_OWN_TICKET");
        }

        foreach (var entry in ChangedEntries<AuditLog>())
        {
            var log = entry.Entity;
            var valid = log.PerformedByActorType switch
            {
                Domain.Enums.AuditActorType.System => !log.PerformedByEmployeeId.HasValue && !log.PerformedByExternalReporterId.HasValue,
                Domain.Enums.AuditActorType.Employee => log.PerformedByEmployeeId.HasValue && !log.PerformedByExternalReporterId.HasValue,
                Domain.Enums.AuditActorType.External => !log.PerformedByEmployeeId.HasValue && log.PerformedByExternalReporterId.HasValue,
                _ => false
            };
            if (!valid)
                throw new InvalidOperationException("AUDIT_ACTOR_INVALID");
        }
    }

    private IEnumerable<Microsoft.EntityFrameworkCore.ChangeTracking.EntityEntry<TEntity>> ChangedEntries<TEntity>()
        where TEntity : class
        => ChangeTracker.Entries<TEntity>()
            .Where(entry => entry.State is EntityState.Added or EntityState.Modified);

    private static void EnsureExactlyOneActor(Guid? employeeId, Guid? externalReporterId)
    {
        if (employeeId.HasValue == externalReporterId.HasValue)
            throw new InvalidOperationException("TICKET_ACTOR_EXACTLY_ONE_REQUIRED");
    }

    public async Task ExecuteInTransactionAsync(
        Func<CancellationToken, Task> action,
        CancellationToken cancellationToken = default)
    {
        var strategy = Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            // reset ทุกครั้งที่เริ่มรอบใหม่ เพราะ execution strategy อาจ retry action ซ้ำได้
            _pendingNotificationDispatch = false;
            await using var transaction = await Database.BeginTransactionAsync(cancellationToken);
            await action(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        });

        // ส่งสัญญาณหลัง commit สำเร็จเท่านั้น ถ้าส่งก่อน worker จะมองไม่เห็นแถวที่ยังไม่ commit
        if (_pendingNotificationDispatch)
        {
            _pendingNotificationDispatch = false;
            notificationDispatch?.RequestDispatch();
        }
    }
}
