using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public class ProvinceConfiguration : IEntityTypeConfiguration<Province>
{
    public void Configure(EntityTypeBuilder<Province> builder)
    {
        builder.ToTable("provinces", t => t.ExcludeFromMigrations());
        builder.HasKey(x => x.ProvinceId);
        builder.Property(x => x.ProvinceId).HasColumnName("PROVINCE_ID");
        builder.Property(x => x.ProvinceCode).HasColumnName("PROVINCE_CODE");
        builder.Property(x => x.ProvinceName).HasColumnName("PROVINCE_NAME");
        builder.Property(x => x.GeoId).HasColumnName("GEO_ID");

        builder.HasMany(x => x.Districts)
               .WithOne(x => x.Province)
               .HasForeignKey(x => x.ProvinceId)
               .OnDelete(DeleteBehavior.NoAction);
    }
}
