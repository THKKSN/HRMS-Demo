using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public class MemoActivityConfiguration : IEntityTypeConfiguration<MemoActivity>
{
    public void Configure(EntityTypeBuilder<MemoActivity> builder)
    {
        builder.ToTable("memo_activities");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");
        builder.Property(x => x.MemoId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.MemoStepInstanceId).HasColumnType("char(36)");
        builder.Property(x => x.AuthorEmployeeId).HasColumnType("char(36)");
        builder.Property(x => x.Message).HasColumnType("text").IsRequired();
        builder.Property(x => x.IsSystem).HasColumnType("tinyint(1)");
        builder.Property(x => x.CreatedAt).HasColumnType("datetime");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime");

        builder.HasIndex(x => x.MemoId).HasDatabaseName("ix_memo_activities_memo_id");

        builder.HasOne(x => x.Memo)
            .WithMany(m => m.Activities)
            .HasForeignKey(x => x.MemoId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.MemoStepInstance)
            .WithMany()
            .HasForeignKey(x => x.MemoStepInstanceId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(x => x.AuthorEmployee)
            .WithMany()
            .HasForeignKey(x => x.AuthorEmployeeId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
