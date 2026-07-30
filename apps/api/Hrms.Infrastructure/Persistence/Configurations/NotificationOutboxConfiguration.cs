using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public class NotificationOutboxConfiguration : IEntityTypeConfiguration<NotificationOutbox>
{
    public void Configure(EntityTypeBuilder<NotificationOutbox> builder)
    {
        builder.ToTable("notification_outboxes");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");
        builder.Property(x => x.RecipientEmployeeId).HasColumnType("char(36)");
        builder.Property(x => x.LineUserId).HasMaxLength(100).IsRequired();
        builder.Property(x => x.EventType).HasMaxLength(80).IsRequired();
        builder.Property(x => x.EntityType).HasMaxLength(50).IsRequired();
        builder.Property(x => x.EntityId).HasColumnType("char(36)");
        builder.Property(x => x.EntityReference).HasMaxLength(100);
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
        builder.HasIndex(x => new { x.EntityType, x.EntityId });
        builder.HasOne(x => x.RecipientEmployee)
            .WithMany()
            .HasForeignKey(x => x.RecipientEmployeeId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
