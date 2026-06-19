using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public class LocationConfiguration : IEntityTypeConfiguration<Location>
{
    public void Configure(EntityTypeBuilder<Location> builder)
    {
        builder.ToTable("locations");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");
        builder.Property(x => x.CompanyId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.Name).HasMaxLength(200).IsRequired();
        builder.Property(x => x.Latitude).HasColumnType("double").IsRequired();
        builder.Property(x => x.Longitude).HasColumnType("double").IsRequired();
        builder.Property(x => x.RadiusMeters).IsRequired();
        builder.Property(x => x.ProvinceId).HasColumnType("int");
        builder.Property(x => x.DistrictId).HasColumnType("int");
        builder.Property(x => x.SubDistrictId).HasColumnType("int");
        builder.Property(x => x.Address).HasMaxLength(500);
        builder.Property(x => x.IsActive).HasColumnType("tinyint(1)");
        builder.Property(x => x.CreatedAt).HasColumnType("datetime");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime");

        builder.HasIndex(x => x.CompanyId).HasDatabaseName("ix_locations_company_id");

        builder.HasOne(x => x.Company)
               .WithMany()
               .HasForeignKey(x => x.CompanyId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Province)
               .WithMany()
               .HasForeignKey(x => x.ProvinceId)
               .OnDelete(DeleteBehavior.NoAction);

        builder.HasOne(x => x.District)
               .WithMany()
               .HasForeignKey(x => x.DistrictId)
               .OnDelete(DeleteBehavior.NoAction);

        builder.HasOne(x => x.SubDistrict)
               .WithMany()
               .HasForeignKey(x => x.SubDistrictId)
               .OnDelete(DeleteBehavior.NoAction);
    }
}
