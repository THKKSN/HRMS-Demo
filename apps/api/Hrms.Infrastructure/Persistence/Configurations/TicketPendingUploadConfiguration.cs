using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public class TicketPendingUploadConfiguration : IEntityTypeConfiguration<TicketPendingUpload>
{
    public void Configure(EntityTypeBuilder<TicketPendingUpload> builder)
    {
        builder.ToTable("ticket_pending_uploads", table => table.HasCheckConstraint(
            "ck_ticket_pending_uploads_actor",
            "((uploaded_by_employee_id IS NOT NULL AND uploaded_by_external_reporter_id IS NULL) OR " +
            "(uploaded_by_employee_id IS NULL AND uploaded_by_external_reporter_id IS NOT NULL))"));
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");
        builder.Property(x => x.UploadedByEmployeeId).HasColumnType("char(36)");
        builder.Property(x => x.UploadedByExternalReporterId).HasColumnType("char(36)");
        builder.Property(x => x.StorageKey).HasMaxLength(500).IsRequired();
        builder.Property(x => x.FileName).HasMaxLength(255).IsRequired();
        builder.Property(x => x.ContentType).HasMaxLength(100).IsRequired();
        builder.Property(x => x.TicketAttachmentId).HasColumnType("char(36)");
        builder.Property(x => x.CreatedAt).HasColumnType("datetime");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime");
        builder.Property(x => x.LinkedAt).HasColumnType("datetime");
        builder.HasIndex(x => x.StorageKey).IsUnique();
        builder.HasIndex(x => new { x.LinkedAt, x.CreatedAt });
        builder.HasIndex(x => x.UploadedByExternalReporterId);
        builder.HasOne(x => x.UploadedByEmployee)
            .WithMany()
            .HasForeignKey(x => x.UploadedByEmployeeId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.UploadedByExternalReporter)
            .WithMany()
            .HasForeignKey(x => x.UploadedByExternalReporterId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
