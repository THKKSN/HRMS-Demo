using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public class DistrictConfiguration : IEntityTypeConfiguration<District>
{
    public void Configure(EntityTypeBuilder<District> builder)
    {
        builder.ToTable("district", t => t.ExcludeFromMigrations());
        builder.HasKey(x => x.DistrictId);
        builder.Property(x => x.DistrictId).HasColumnName("DISTRICT_ID");
        builder.Property(x => x.DistrictCode).HasColumnName("DISTRICT_CODE");
        builder.Property(x => x.DistrictName).HasColumnName("DISTRICT_NAME");
        builder.Property(x => x.GeoId).HasColumnName("GEO_ID");
        builder.Property(x => x.ProvinceId).HasColumnName("PROVINCE_ID");

        builder.HasMany(x => x.SubDistricts)
               .WithOne(x => x.District)
               .HasForeignKey(x => x.DistrictId)
               .OnDelete(DeleteBehavior.NoAction);
    }
}
