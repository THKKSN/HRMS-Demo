using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public class ExternalRepairSyncOutboxConfiguration : IEntityTypeConfiguration<ExternalRepairSyncOutbox>
{
    public void Configure(EntityTypeBuilder<ExternalRepairSyncOutbox> builder)
    {
        builder.ToTable("external_repair_sync_outboxes");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");
        builder.Property(x => x.TicketId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.PayloadJson).HasColumnType("longtext").IsRequired();
        builder.Property(x => x.DeduplicationKey).HasMaxLength(255).IsRequired();
        builder.Property(x => x.LastError).HasMaxLength(2000);
        builder.Property(x => x.CreatedAt).HasColumnType("datetime");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime");
        builder.Property(x => x.NextAttemptAt).HasColumnType("datetime");
        builder.Property(x => x.ProcessingStartedAt).HasColumnType("datetime");
        builder.Property(x => x.SentAt).HasColumnType("datetime");
        builder.HasIndex(x => x.DeduplicationKey).IsUnique();
        builder.HasIndex(x => new { x.Status, x.NextAttemptAt, x.CreatedAt });
        builder.HasIndex(x => x.TicketId);

        builder.HasOne(x => x.Ticket)
            .WithMany()
            .HasForeignKey(x => x.TicketId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
