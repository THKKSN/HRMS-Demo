using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public class SubDistrictConfiguration : IEntityTypeConfiguration<SubDistrict>
{
    public void Configure(EntityTypeBuilder<SubDistrict> builder)
    {
        builder.ToTable("subdistrict", t => t.ExcludeFromMigrations());
        builder.HasKey(x => x.SubDistrictId);
        builder.Property(x => x.SubDistrictId).HasColumnName("SUB_DISTRICT_ID");
        builder.Property(x => x.SubDistrictCode).HasColumnName("SUB_DISTRICT_CODE");
        builder.Property(x => x.SubDistrictName).HasColumnName("SUB_DISTRICT_NAME");
        builder.Property(x => x.DistrictId).HasColumnName("DISTRICT_ID");
        builder.Property(x => x.ProvinceId).HasColumnName("PROVINCE_ID");
        builder.Property(x => x.GeoId).HasColumnName("GEO_ID");
    }
}
