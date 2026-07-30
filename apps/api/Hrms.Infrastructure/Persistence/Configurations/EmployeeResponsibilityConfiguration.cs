using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public class EmployeeResponsibilityConfiguration : IEntityTypeConfiguration<EmployeeResponsibility>
{
    public void Configure(EntityTypeBuilder<EmployeeResponsibility> builder)
    {
        builder.ToTable("employee_responsibilities");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");
        builder.Property(x => x.CompanyId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.DepartmentId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.CategoryId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.TopicId).HasColumnType("char(36)");
        builder.Property(x => x.EmployeeId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.CreatedByEmployeeId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.EffectiveFrom).HasColumnType("date");
        builder.Property(x => x.EffectiveTo).HasColumnType("date");
        builder.Property(x => x.Note).HasMaxLength(500);
        builder.Property(x => x.CreatedAt).HasColumnType("datetime");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime");

        builder.HasIndex(x => new { x.DepartmentId, x.TopicId, x.IsActive });
        builder.HasIndex(x => new { x.DepartmentId, x.CategoryId, x.TopicId, x.IsActive });
        builder.HasIndex(x => new { x.EmployeeId, x.IsActive });

        builder.HasOne(x => x.Company).WithMany().HasForeignKey(x => x.CompanyId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.Department).WithMany().HasForeignKey(x => x.DepartmentId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.Category).WithMany(x => x.Responsibilities).HasForeignKey(x => x.CategoryId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(x => x.Topic).WithMany(x => x.Responsibilities).HasForeignKey(x => x.TopicId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(x => x.Employee).WithMany().HasForeignKey(x => x.EmployeeId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.CreatedByEmployee).WithMany().HasForeignKey(x => x.CreatedByEmployeeId).OnDelete(DeleteBehavior.Restrict);
    }
}
