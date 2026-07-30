using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> builder)
    {
        builder.ToTable("audit_logs");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Module).HasMaxLength(50).IsRequired();
        builder.Property(x => x.EntityType).HasMaxLength(100).IsRequired();
        builder.Property(x => x.EntityId).HasMaxLength(36).IsRequired();
        builder.Property(x => x.Action).HasMaxLength(50).IsRequired();
        builder.Property(x => x.Description).HasMaxLength(500).IsRequired();
        builder.Property(x => x.OldValues).HasColumnType("TEXT");
        builder.Property(x => x.NewValues).HasColumnType("TEXT");
        builder.Property(x => x.PerformedByName).HasMaxLength(200);

        builder.HasIndex(x => x.CreatedAt);
        builder.HasIndex(x => new { x.Module, x.EntityType, x.EntityId });
        builder.HasIndex(x => x.PerformedByEmployeeId);
    }
}
