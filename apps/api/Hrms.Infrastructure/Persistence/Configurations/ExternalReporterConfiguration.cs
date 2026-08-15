using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public sealed class ExternalReporterConfiguration : IEntityTypeConfiguration<ExternalReporter>
{
    public void Configure(EntityTypeBuilder<ExternalReporter> builder)
    {
        builder.ToTable("external_reporters");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");
        builder.Property(x => x.LineUserId).HasMaxLength(100).IsRequired();
        builder.Property(x => x.LineDisplayName).HasMaxLength(200).IsRequired();
        builder.Property(x => x.PictureUrl).HasMaxLength(1000);
        builder.Property(x => x.FullName).HasMaxLength(200);
        builder.Property(x => x.Phone).HasMaxLength(20);
        builder.Property(x => x.Email).HasMaxLength(320);
        builder.Property(x => x.Organization).HasMaxLength(200);
        builder.Property(x => x.PrivacyNoticeVersion).HasMaxLength(100);
        builder.Property(x => x.ConsentedAt).HasColumnType("datetime");
        builder.Property(x => x.LastLoginAt).HasColumnType("datetime");
        builder.Property(x => x.IsActive).HasDefaultValue(true);
        builder.Property(x => x.CreatedAt).HasColumnType("datetime");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime");

        builder.HasIndex(x => x.LineUserId).IsUnique();
        builder.HasIndex(x => new { x.IsActive, x.LastLoginAt });
    }
}
