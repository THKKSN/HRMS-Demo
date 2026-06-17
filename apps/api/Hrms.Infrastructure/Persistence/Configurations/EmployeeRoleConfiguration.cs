using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public class EmployeeRoleConfiguration : IEntityTypeConfiguration<EmployeeRole>
{
    public void Configure(EntityTypeBuilder<EmployeeRole> builder)
    {
        builder.ToTable("employee_roles");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");
        builder.Property(x => x.EmployeeId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.Role).HasConversion<string>().HasMaxLength(20);
        builder.Property(x => x.CompanyId).HasColumnType("char(36)");
        builder.Property(x => x.DepartmentId).HasColumnType("char(36)");
        builder.Property(x => x.IsActive).HasColumnType("tinyint(1)");
        builder.Property(x => x.ValidFrom).HasColumnType("datetime");
        builder.Property(x => x.ValidTo).HasColumnType("datetime");
        builder.Property(x => x.GrantedBy).HasColumnType("char(36)");
        builder.Property(x => x.CreatedAt).HasColumnType("datetime");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime");

        builder.HasIndex(x => new { x.EmployeeId, x.Role, x.CompanyId, x.IsActive });

        builder.HasOne(x => x.Employee)
            .WithMany(x => x.Roles)
            .HasForeignKey(x => x.EmployeeId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
