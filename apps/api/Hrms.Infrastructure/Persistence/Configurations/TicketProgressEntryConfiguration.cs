using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public class TicketProgressEntryConfiguration : IEntityTypeConfiguration<TicketProgressEntry>
{
    public void Configure(EntityTypeBuilder<TicketProgressEntry> builder)
    {
        builder.ToTable("ticket_progress_entries");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");
        builder.Property(x => x.TicketId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.WorkflowStepKey).HasMaxLength(100).IsRequired();
        builder.Property(x => x.WorkState).HasMaxLength(200);
        builder.Property(x => x.BlockerReason).HasMaxLength(200);
        builder.Property(x => x.NextAction).HasMaxLength(200);
        builder.Property(x => x.IsCompleted).HasDefaultValue(false);
        builder.Property(x => x.Note).HasMaxLength(2000);
        builder.Property(x => x.OwnerEmployeeId).HasColumnType("char(36)");
        builder.Property(x => x.CreatedByEmployeeId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.DueAt).HasColumnType("datetime");
        builder.Property(x => x.CreatedAt).HasColumnType("datetime");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime");

        builder.HasIndex(x => new { x.TicketId, x.CreatedAt });
        builder.HasIndex(x => new { x.TicketId, x.WorkflowStepKey, x.CreatedAt });

        builder.HasOne(x => x.Ticket)
            .WithMany(x => x.ProgressEntries)
            .HasForeignKey(x => x.TicketId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.OwnerEmployee)
            .WithMany()
            .HasForeignKey(x => x.OwnerEmployeeId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(x => x.CreatedByEmployee)
            .WithMany()
            .HasForeignKey(x => x.CreatedByEmployeeId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
