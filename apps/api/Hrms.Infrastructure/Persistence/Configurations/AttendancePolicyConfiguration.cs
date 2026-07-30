using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public class AttendancePolicyConfiguration : IEntityTypeConfiguration<AttendancePolicy>
{
    public void Configure(EntityTypeBuilder<AttendancePolicy> builder)
    {
        builder.ToTable("attendance_policies");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");
        builder.Property(x => x.CompanyId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.MaxLateMinutesPerMonth).HasDefaultValue(90);
        builder.Property(x => x.MaxLateCountPerMonth).HasDefaultValue(10);
        builder.Property(x => x.MaxAbsenceCountPerMonth).HasDefaultValue(3);
        builder.Property(x => x.IsActive).HasColumnType("tinyint(1)");
        builder.Property(x => x.CreatedAt).HasColumnType("datetime");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime");

        builder.HasIndex(x => x.CompanyId)
               .IsUnique()
               .HasDatabaseName("ix_attendance_policies_company_id");

        builder.HasOne(x => x.Company)
               .WithOne()
               .HasForeignKey<AttendancePolicy>(x => x.CompanyId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
