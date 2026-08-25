using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public class ExternalTicketConfigurationConfiguration : IEntityTypeConfiguration<ExternalTicketConfiguration>
{
    public void Configure(EntityTypeBuilder<ExternalTicketConfiguration> builder)
    {
        builder.ToTable("external_ticket_configurations");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");
        builder.Property(x => x.TargetCompanyId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.PrivacyNoticeVersion).HasMaxLength(50);
        builder.Property(x => x.PrivacyNoticeUrl).HasMaxLength(500);
        builder.Property(x => x.CreatedAt).HasColumnType("datetime");
        // datetime(6) เพื่อให้ concurrency token จับ stale write ได้แม้แก้ 2 ครั้งในวินาทีเดียวกัน
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime(6)").IsConcurrencyToken();

        builder.HasIndex(x => x.TargetCompanyId).IsUnique();

        builder.HasOne(x => x.TargetCompany)
            .WithMany()
            .HasForeignKey(x => x.TargetCompanyId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
