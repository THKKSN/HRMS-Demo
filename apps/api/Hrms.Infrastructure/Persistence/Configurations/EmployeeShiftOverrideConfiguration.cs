using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public class EmployeeShiftOverrideConfiguration : IEntityTypeConfiguration<EmployeeShiftOverride>
{
    public void Configure(EntityTypeBuilder<EmployeeShiftOverride> builder)
    {
        builder.ToTable("employee_shift_overrides");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");
        builder.Property(x => x.EmployeeId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.ShiftId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.CreatedByHrId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.Reason).HasMaxLength(500);
        builder.Property(x => x.CreatedAt).HasColumnType("datetime");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime");

        builder.HasIndex(x => new { x.EmployeeId, x.EffectiveFrom });
        builder.HasIndex(x => new { x.EmployeeId, x.IsActive });

        builder.HasOne(x => x.Employee)
            .WithMany(x => x.ShiftOverrides)
            .HasForeignKey(x => x.EmployeeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Shift)
            .WithMany()
            .HasForeignKey(x => x.ShiftId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.CreatedByHr)
            .WithMany()
            .HasForeignKey(x => x.CreatedByHrId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
