using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<Company>      Companies      { get; } // table: companies
    DbSet<Department>   Departments    { get; } // table: departments
    DbSet<Employee>     Employees      { get; } // table: employees
    DbSet<SystemRole>   SystemRoles    { get; } // table: roles
    DbSet<EmployeeRole> EmployeeRoles  { get; } // table: employee_roles
    DbSet<LeaveType>    LeaveTypes     { get; } // table: leave_types
    DbSet<LeaveRequest> LeaveRequests  { get; } // table: leave_requests
    DbSet<LeaveBalance> LeaveBalances  { get; } // table: leave_balances
    DbSet<AttendanceRecord> AttendanceRecords { get; } // table: attendance_records
    DbSet<Shift>            Shifts            { get; } // table: shifts
    DbSet<AttendancePolicy> AttendancePolicies { get; } // table: attendance_policies
    DbSet<Holiday>                 Holidays                 { get; } // table: holidays
    DbSet<WeeklyHolidaySchedule>  WeeklyHolidaySchedules   { get; } // table: weekly_holiday_schedules
    DbSet<RefreshToken> RefreshTokens  { get; } // table: refresh_tokens
    DbSet<LoginHistory> LoginHistories { get; } // table: login_histories

    DbSet<Permission>       Permissions      { get; } // table: permissions
    DbSet<RolePermission>  RolePermissions  { get; } // table: role_permissions
    DbSet<AuditLog>        AuditLogs        { get; } // table: audit_logs
    DbSet<ExternalReporter> ExternalReporters { get; }

    DbSet<OtRequest>             OtRequests             { get; } // table: ot_requests
    DbSet<ExpenseClaim>          ExpenseClaims          { get; } // table: expense_claims
    DbSet<ExpenseOcrResult>       ExpenseOcrResults      { get; } // table: expense_ocr_results
    DbSet<ExpenseBillingBatch>    ExpenseBillingBatches  { get; } // table: expense_billing_batches
    DbSet<ExpenseBillingBatchItem> ExpenseBillingBatchItems { get; } // table: expense_billing_batch_items
    DbSet<EmployeeShiftOverride> EmployeeShiftOverrides { get; } // table: employee_shift_overrides

    DbSet<Location>     Locations      { get; } // table: locations
    DbSet<RoleLabel>    RoleLabels     { get; } // table: role_labels
    DbSet<Ticket>           Tickets           { get; } // table: tickets
    DbSet<TicketCategory>   TicketCategories  { get; } // table: ticket_categories
    DbSet<TicketTopic>      TicketTopics      { get; } // table: ticket_topics
    DbSet<TicketSubject>    TicketSubjects    { get; } // table: ticket_subjects
    DbSet<TicketAttachment> TicketAttachments { get; } // table: ticket_attachments
    DbSet<TicketPendingUpload> TicketPendingUploads { get; }
    DbSet<TicketDailySequence> TicketDailySequences { get; }
    DbSet<TicketAssignment> TicketAssignments { get; } // table: ticket_assignments
    DbSet<TicketComment>    TicketComments    { get; } // table: ticket_comments
    DbSet<TicketReview>     TicketReviews     { get; } // table: ticket_reviews
    DbSet<TicketStatusHistory> TicketStatusHistory { get; } // table: ticket_status_history
    DbSet<TicketCancellationRequest> TicketCancellationRequests { get; } // table: ticket_cancellation_requests
    DbSet<TicketProgressEntry> TicketProgressEntries { get; }
    DbSet<TicketWorkflowDefinition> TicketWorkflowDefinitions { get; }
    DbSet<TicketSubjectGuidanceConfig> TicketSubjectGuidanceConfigs { get; }
    DbSet<EmployeeResponsibility> EmployeeResponsibilities { get; }
    DbSet<NotificationOutbox> NotificationOutboxes { get; }
    DbSet<ExternalRepairSyncOutbox> ExternalRepairSyncOutboxes { get; }
    DbSet<ExternalTicketConfiguration> ExternalTicketConfigurations { get; } // table: external_ticket_configurations
    DbSet<ExternalTicketCategory> ExternalTicketCategories { get; } // table: external_ticket_categories
    DbSet<ExternalTicketTopic> ExternalTicketTopics { get; } // table: external_ticket_topics
    DbSet<ExternalTicketSubject> ExternalTicketSubjects { get; } // table: external_ticket_subjects

    // Address reference data — read-only, imported directly to DB
    DbSet<Province>    Provinces    { get; }
    DbSet<District>    Districts    { get; }
    DbSet<SubDistrict> SubDistricts { get; }
    DbSet<ZipCode>     ZipCodes     { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    Task ExecuteInTransactionAsync(Func<CancellationToken, Task> action, CancellationToken cancellationToken = default);
}
