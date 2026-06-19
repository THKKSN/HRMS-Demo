using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public class ZipCodeConfiguration : IEntityTypeConfiguration<ZipCode>
{
    public void Configure(EntityTypeBuilder<ZipCode> builder)
    {
        builder.ToTable("zip_code", t => t.ExcludeFromMigrations());
        builder.HasNoKey();
        builder.Property(x => x.ZipcodeId).HasColumnName("ZIPCODE_ID");
        builder.Property(x => x.SubDistrictCode).HasColumnName("SUB_DISTRICT_CODE");
        builder.Property(x => x.ProvinceId).HasColumnName("PROVINCE_ID");
        builder.Property(x => x.DistrictId).HasColumnName("DISTRICT_ID");
        builder.Property(x => x.SubDistrictId).HasColumnName("SUB_DISTRICT_ID");
        builder.Property(x => x.Zipcode).HasColumnName("ZIPCODE");
    }
}
