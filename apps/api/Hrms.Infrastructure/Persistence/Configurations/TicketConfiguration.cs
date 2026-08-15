using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public class TicketConfiguration : IEntityTypeConfiguration<Ticket>
{
    public void Configure(EntityTypeBuilder<Ticket> builder)
    {
        builder.ToTable("tickets", table => table.HasCheckConstraint(
            "ck_tickets_requester_actor",
            "((requester_employee_id IS NOT NULL AND external_reporter_id IS NULL AND request_type = 'Internal') OR " +
            "(requester_employee_id IS NULL AND external_reporter_id IS NOT NULL AND request_type = 'External'))"));
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");
        builder.Property(x => x.TicketNo).HasMaxLength(30).IsRequired();
        builder.Property(x => x.RequestType).HasConversion<string>().HasMaxLength(20);
        builder.Property(x => x.RequesterEmployeeId).HasColumnType("char(36)");
        builder.Property(x => x.ExternalReporterId).HasColumnType("char(36)");
        builder.Property(x => x.SourceCompanyId).HasColumnType("char(36)");
        builder.Property(x => x.SourceDepartmentId).HasColumnType("char(36)");
        builder.Property(x => x.TargetCompanyId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.TargetDepartmentId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.CategoryId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.TopicId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.SubjectId).HasColumnType("char(36)");
        builder.Property(x => x.WorkflowDefinitionId).HasColumnType("char(36)");
        builder.Property(x => x.SubjectGuidanceConfigId).HasColumnType("char(36)");
        builder.Property(x => x.OtherTopicText).HasMaxLength(200);
        builder.Property(x => x.Title).HasMaxLength(200).IsRequired();
        builder.Property(x => x.Detail).HasMaxLength(2000).IsRequired();
        builder.Property(x => x.WorkflowName).HasMaxLength(200);
        builder.Property(x => x.WorkflowStepsJson).HasColumnType("longtext");
        builder.Property(x => x.WorkflowStatusStepMapJson).HasColumnType("longtext");
        builder.Property(x => x.WorkflowBoardStepsJson).HasColumnType("longtext");
        builder.Property(x => x.WorkflowInProgressPresetsJson).HasColumnType("longtext");
        builder.Property(x => x.WorkflowActionsJson).HasColumnType("longtext");
        builder.Property(x => x.SubjectGuidanceConfigName).HasMaxLength(200);
        builder.Property(x => x.WorkflowCurrentStepKey).HasMaxLength(100);
        builder.Property(x => x.CurrentWorkState).HasMaxLength(200);
        builder.Property(x => x.CurrentBlockerReason).HasMaxLength(200);
        builder.Property(x => x.CurrentNextAction).HasMaxLength(200);
        builder.Property(x => x.Priority).HasConversion<string>().HasMaxLength(20);
        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(30);
        builder.Property(x => x.RoutingMode).HasConversion<string>().HasMaxLength(30);
        builder.Property(x => x.RoutingLevel).HasConversion<string>().HasMaxLength(20);
        builder.Property(x => x.RoutingOutcome).HasConversion<string>().HasMaxLength(30);
        builder.Property(x => x.Version)
            .HasColumnType("bigint")
            .HasDefaultValue(1L)
            .IsConcurrencyToken();
        builder.Property(x => x.VehicleText).HasMaxLength(100);
        builder.Property(x => x.LocationText).HasMaxLength(200);
        builder.Property(x => x.ContactPhone).HasMaxLength(30);
        builder.Property(x => x.ContactNote).HasMaxLength(500);
        builder.Property(x => x.RequesterNameSnapshot).HasMaxLength(200);
        builder.Property(x => x.RequesterPhoneSnapshot).HasMaxLength(20);
        builder.Property(x => x.RequesterEmailSnapshot).HasMaxLength(320);
        builder.Property(x => x.RequesterOrganizationSnapshot).HasMaxLength(200);
        builder.Property(x => x.RequesterLineDisplayNameSnapshot).HasMaxLength(200);
        builder.Property(x => x.ReceiverEmployeeId).HasColumnType("char(36)");
        builder.Property(x => x.SupervisorAcceptedByEmployeeId).HasColumnType("char(36)");
        builder.Property(x => x.WorkStartedByEmployeeId).HasColumnType("char(36)");
        builder.Property(x => x.WaitingInfoByEmployeeId).HasColumnType("char(36)");
        builder.Property(x => x.ProblemType).HasConversion<string>().HasMaxLength(30);
        builder.Property(x => x.InitialInspectionNote).HasMaxLength(2000);
        builder.Property(x => x.ResolutionNote).HasMaxLength(2000);
        builder.Property(x => x.ResolvedByEmployeeId).HasColumnType("char(36)");
        builder.Property(x => x.ClosedByEmployeeId).HasColumnType("char(36)");
        builder.Property(x => x.ClosedByExternalReporterId).HasColumnType("char(36)");
        builder.Property(x => x.VerifiedByEmployeeId).HasColumnType("char(36)");
        builder.Property(x => x.RejectedByEmployeeId).HasColumnType("char(36)");
        builder.Property(x => x.RejectionReason).HasMaxLength(1000);
        builder.Property(x => x.CancelledByEmployeeId).HasColumnType("char(36)");
        builder.Property(x => x.CancelledAt).HasColumnType("datetime");
        builder.Property(x => x.CancellationReason).HasMaxLength(1000);
        builder.Property(x => x.SupervisorAcceptedAt).HasColumnType("datetime");
        builder.Property(x => x.WorkStartedAt).HasColumnType("datetime");
        builder.Property(x => x.WaitingInfoAt).HasColumnType("datetime");
        builder.Property(x => x.ResolvedAt).HasColumnType("datetime");
        builder.Property(x => x.ClosedAt).HasColumnType("datetime");
        builder.Property(x => x.VerifiedAt).HasColumnType("datetime");
        builder.Property(x => x.RejectedAt).HasColumnType("datetime");
        builder.Property(x => x.CreatedAt).HasColumnType("datetime");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime");

        builder.HasIndex(x => x.TicketNo).IsUnique();
        builder.HasIndex(x => new { x.RequesterEmployeeId, x.Status });
        builder.HasIndex(x => new { x.ExternalReporterId, x.Status });
        builder.HasIndex(x => new { x.TargetDepartmentId, x.Status });
        builder.HasIndex(x => new { x.CategoryId, x.TopicId, x.Status });
        builder.HasIndex(x => new { x.SubjectId, x.Status });
        builder.HasIndex(x => new { x.Status, x.UpdatedAt });
        builder.HasIndex(x => new { x.Status, x.VerifiedAt });
        builder.HasIndex(x => new { x.RoutingOutcome, x.CreatedAt });

        builder.HasOne(x => x.RequesterEmployee).WithMany().HasForeignKey(x => x.RequesterEmployeeId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.ExternalReporter).WithMany().HasForeignKey(x => x.ExternalReporterId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.SourceCompany).WithMany().HasForeignKey(x => x.SourceCompanyId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.SourceDepartment).WithMany().HasForeignKey(x => x.SourceDepartmentId).OnDelete(DeleteBehavior.SetNull);
        builder.HasOne(x => x.TargetCompany).WithMany().HasForeignKey(x => x.TargetCompanyId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.TargetDepartment).WithMany().HasForeignKey(x => x.TargetDepartmentId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.Category).WithMany().HasForeignKey(x => x.CategoryId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.Topic).WithMany(x => x.Tickets).HasForeignKey(x => x.TopicId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.Subject).WithMany(x => x.Tickets).HasForeignKey(x => x.SubjectId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.WorkflowDefinition).WithMany(x => x.Tickets).HasForeignKey(x => x.WorkflowDefinitionId).OnDelete(DeleteBehavior.SetNull);
        builder.HasOne(x => x.SubjectGuidanceConfig).WithMany(x => x.Tickets).HasForeignKey(x => x.SubjectGuidanceConfigId).OnDelete(DeleteBehavior.SetNull);
        builder.HasOne(x => x.ReceiverEmployee).WithMany().HasForeignKey(x => x.ReceiverEmployeeId).OnDelete(DeleteBehavior.SetNull);
        builder.HasOne(x => x.SupervisorAcceptedByEmployee).WithMany().HasForeignKey(x => x.SupervisorAcceptedByEmployeeId).OnDelete(DeleteBehavior.SetNull);
        builder.HasOne(x => x.WorkStartedByEmployee).WithMany().HasForeignKey(x => x.WorkStartedByEmployeeId).OnDelete(DeleteBehavior.SetNull);
        builder.HasOne(x => x.WaitingInfoByEmployee).WithMany().HasForeignKey(x => x.WaitingInfoByEmployeeId).OnDelete(DeleteBehavior.SetNull);
        builder.HasOne(x => x.ResolvedByEmployee).WithMany().HasForeignKey(x => x.ResolvedByEmployeeId).OnDelete(DeleteBehavior.SetNull);
        builder.HasOne(x => x.ClosedByEmployee).WithMany().HasForeignKey(x => x.ClosedByEmployeeId).OnDelete(DeleteBehavior.SetNull);
        builder.HasOne(x => x.ClosedByExternalReporter).WithMany().HasForeignKey(x => x.ClosedByExternalReporterId).OnDelete(DeleteBehavior.SetNull);
        builder.HasOne(x => x.VerifiedByEmployee).WithMany().HasForeignKey(x => x.VerifiedByEmployeeId).OnDelete(DeleteBehavior.SetNull);
        builder.HasOne(x => x.RejectedByEmployee).WithMany().HasForeignKey(x => x.RejectedByEmployeeId).OnDelete(DeleteBehavior.SetNull);
        builder.HasOne(x => x.CancelledByEmployee).WithMany().HasForeignKey(x => x.CancelledByEmployeeId).OnDelete(DeleteBehavior.SetNull);
    }
}
