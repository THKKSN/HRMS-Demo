using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public class MemoCategoryConfiguration : IEntityTypeConfiguration<MemoCategory>
{
    public void Configure(EntityTypeBuilder<MemoCategory> builder)
    {
        builder.ToTable("memo_categories");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");
        builder.Property(x => x.MemoTypeId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.Name).HasMaxLength(200).IsRequired();
        builder.Property(x => x.IsActive).HasColumnType("tinyint(1)");
        builder.Property(x => x.CreatedAt).HasColumnType("datetime");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime");

        // ชื่อซ้ำได้ข้าม MemoType แต่ต้องไม่ซ้ำภายใน MemoType เดียวกัน (เช็คซ้ำระดับ application เพราะ
        // IsActive ต้องเข้าเงื่อนไขด้วย เหมือน MemoType — ดูหมายเหตุใน MemoTypeConfiguration)
        builder.HasIndex(x => new { x.MemoTypeId, x.Name }).HasDatabaseName("ix_memo_categories_type_name");

        builder.HasOne(x => x.MemoType)
            .WithMany(x => x.Categories)
            .HasForeignKey(x => x.MemoTypeId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
