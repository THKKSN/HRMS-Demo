using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public class MemoSubCategoryConfiguration : IEntityTypeConfiguration<MemoSubCategory>
{
    public void Configure(EntityTypeBuilder<MemoSubCategory> builder)
    {
        builder.ToTable("memo_sub_categories");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");
        builder.Property(x => x.MemoCategoryId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.Name).HasMaxLength(200).IsRequired();
        builder.Property(x => x.IsActive).HasColumnType("tinyint(1)");
        builder.Property(x => x.CreatedAt).HasColumnType("datetime");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime");

        builder.HasIndex(x => new { x.MemoCategoryId, x.Name }).HasDatabaseName("ix_memo_sub_categories_category_name");

        builder.HasOne(x => x.MemoCategory)
            .WithMany(x => x.SubCategories)
            .HasForeignKey(x => x.MemoCategoryId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
