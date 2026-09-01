using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public class MemoConfiguration : IEntityTypeConfiguration<Memo>
{
    public void Configure(EntityTypeBuilder<Memo> builder)
    {
        builder.ToTable("memos");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");
        builder.Property(x => x.MemoNo).HasMaxLength(30).IsRequired();
        builder.Property(x => x.MemoTypeId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.MemoCategoryId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.MemoSubCategoryId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.Detail).HasColumnType("text").IsRequired();

        builder.Property(x => x.RequesterId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.CompanyId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.DepartmentId).HasColumnType("char(36)").IsRequired();

        builder.Property(x => x.MemoCategoryNameSnapshot).HasMaxLength(200).IsRequired();
        builder.Property(x => x.MemoSubCategoryNameSnapshot).HasMaxLength(200).IsRequired();

        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(20).IsRequired();

        builder.Property(x => x.ApprovedAt).HasColumnType("datetime");
        builder.Property(x => x.ApprovedByEmployeeId).HasColumnType("char(36)");
        builder.Property(x => x.RejectedAt).HasColumnType("datetime");
        builder.Property(x => x.RejectReason).HasMaxLength(1000);

        builder.Property(x => x.AcknowledgedAt).HasColumnType("datetime");
        builder.Property(x => x.AcknowledgedByEmployeeId).HasColumnType("char(36)");

        builder.Property(x => x.DeliveredAt).HasColumnType("datetime");
        builder.Property(x => x.DeliveredByEmployeeId).HasColumnType("char(36)");

        builder.Property(x => x.ReceivedAt).HasColumnType("datetime");
        builder.Property(x => x.ReceivedByEmployeeId).HasColumnType("char(36)");

        builder.Property(x => x.CreatedAt).HasColumnType("datetime");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime");

        builder.HasIndex(x => x.RequesterId).HasDatabaseName("ix_memos_requester_id");
        builder.HasIndex(x => x.Status).HasDatabaseName("ix_memos_status");
        builder.HasIndex(x => x.MemoNo).IsUnique().HasDatabaseName("ix_memos_memo_no");

        builder.HasOne(x => x.MemoType)
            .WithMany()
            .HasForeignKey(x => x.MemoTypeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.MemoCategory)
            .WithMany()
            .HasForeignKey(x => x.MemoCategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.MemoSubCategory)
            .WithMany()
            .HasForeignKey(x => x.MemoSubCategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Requester)
            .WithMany()
            .HasForeignKey(x => x.RequesterId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Company)
            .WithMany()
            .HasForeignKey(x => x.CompanyId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Department)
            .WithMany()
            .HasForeignKey(x => x.DepartmentId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.ApprovedByEmployee)
            .WithMany()
            .HasForeignKey(x => x.ApprovedByEmployeeId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(x => x.AcknowledgedByEmployee)
            .WithMany()
            .HasForeignKey(x => x.AcknowledgedByEmployeeId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(x => x.DeliveredByEmployee)
            .WithMany()
            .HasForeignKey(x => x.DeliveredByEmployeeId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(x => x.ReceivedByEmployee)
            .WithMany()
            .HasForeignKey(x => x.ReceivedByEmployeeId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
