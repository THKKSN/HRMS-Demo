using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public class HolidayConfiguration : IEntityTypeConfiguration<Holiday>
{
    public void Configure(EntityTypeBuilder<Holiday> builder)
    {
        builder.ToTable("holidays");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");
        builder.Property(x => x.CompanyId).HasColumnType("char(36)");
        builder.Property(x => x.Name).HasMaxLength(200).IsRequired();
        builder.Property(x => x.Date).HasColumnType("date").IsRequired();
        builder.Property(x => x.IsActive).HasColumnType("tinyint(1)");
        builder.Property(x => x.CreatedAt).HasColumnType("datetime");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime");

        builder.HasIndex(x => new { x.Date, x.CompanyId })
               .HasDatabaseName("ix_holidays_date_company_id");

        builder.HasOne(x => x.Company)
               .WithMany()
               .HasForeignKey(x => x.CompanyId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
