using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public class MemoTypeConfiguration : IEntityTypeConfiguration<MemoType>
{
    public void Configure(EntityTypeBuilder<MemoType> builder)
    {
        builder.ToTable("memo_types");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");
        builder.Property(x => x.Name).HasMaxLength(200).IsRequired();
        builder.Property(x => x.CompanyId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.DepartmentId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.IsActive).HasColumnType("tinyint(1)");
        builder.Property(x => x.CreatedAt).HasColumnType("datetime");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime");

        // MySQL ไม่รองรับ filtered/partial unique index — กันชื่อซ้ำเฉพาะ record ที่ IsActive=true
        // ทำที่ระดับ application (handler เช็ค AnyAsync ก่อน insert/update) แทน ไม่ใช่ DB constraint
        builder.HasIndex(x => x.Name).HasDatabaseName("ix_memo_types_name");
        builder.HasIndex(x => new { x.CompanyId, x.DepartmentId }).HasDatabaseName("ix_memo_types_company_department");

        builder.HasOne(x => x.Company)
            .WithMany()
            .HasForeignKey(x => x.CompanyId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Department)
            .WithMany()
            .HasForeignKey(x => x.DepartmentId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
