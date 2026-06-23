using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public class ShiftConfiguration : IEntityTypeConfiguration<Shift>
{
    public void Configure(EntityTypeBuilder<Shift> builder)
    {
        builder.ToTable("shifts");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");
        builder.Property(x => x.CompanyId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.Name).HasMaxLength(100).IsRequired();
        builder.Property(x => x.StartTime).HasColumnType("time").IsRequired();
        builder.Property(x => x.EndTime).HasColumnType("time").IsRequired();
        builder.Property(x => x.GracePeriodMinutes).HasDefaultValue(0);
        builder.Property(x => x.IsActive).HasColumnType("tinyint(1)");
        builder.Property(x => x.CreatedAt).HasColumnType("datetime");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime");

        builder.HasIndex(x => x.CompanyId).HasDatabaseName("ix_shifts_company_id");

        builder.HasOne(x => x.Company)
               .WithMany()
               .HasForeignKey(x => x.CompanyId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
