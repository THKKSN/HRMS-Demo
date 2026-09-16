using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public class MemoAttachmentConfiguration : IEntityTypeConfiguration<MemoAttachment>
{
    public void Configure(EntityTypeBuilder<MemoAttachment> builder)
    {
        builder.ToTable("memo_attachments");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");
        builder.Property(x => x.MemoId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.MemoStepInstanceId).HasColumnType("char(36)");
        builder.Property(x => x.MemoActivityId).HasColumnType("char(36)");
        builder.Property(x => x.UploadedByEmployeeId).HasColumnType("char(36)");
        builder.Property(x => x.Url).HasMaxLength(500).IsRequired();
        builder.Property(x => x.FileName).HasMaxLength(255);
        builder.Property(x => x.ContentType).HasMaxLength(100);
        builder.Property(x => x.StorageKey).HasMaxLength(255);
        builder.Property(x => x.CreatedAt).HasColumnType("datetime");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime");

        builder.HasIndex(x => x.MemoId).HasDatabaseName("ix_memo_attachments_memo_id");

        builder.HasOne(x => x.Memo)
            .WithMany(m => m.Attachments)
            .HasForeignKey(x => x.MemoId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.MemoStepInstance)
            .WithMany()
            .HasForeignKey(x => x.MemoStepInstanceId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(x => x.MemoActivity)
            .WithMany(a => a.Attachments)
            .HasForeignKey(x => x.MemoActivityId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(x => x.UploadedByEmployee)
            .WithMany()
            .HasForeignKey(x => x.UploadedByEmployeeId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
