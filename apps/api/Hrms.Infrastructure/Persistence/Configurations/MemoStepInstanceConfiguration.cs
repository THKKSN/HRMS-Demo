using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public class MemoStepInstanceConfiguration : IEntityTypeConfiguration<MemoStepInstance>
{
    public void Configure(EntityTypeBuilder<MemoStepInstance> builder)
    {
        builder.ToTable("memo_step_instances");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");
        builder.Property(x => x.MemoId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.SourceStepId).HasColumnType("char(36)");
        builder.Property(x => x.SortOrder).IsRequired();
        builder.Property(x => x.Label).HasMaxLength(200).IsRequired();
        builder.Property(x => x.StepKind).HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(x => x.AssigneeRoleCode).HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(x => x.AssigneeEmployeeId).HasColumnType("char(36)");
        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(x => x.ActedAt).HasColumnType("datetime");
        builder.Property(x => x.ActedByEmployeeId).HasColumnType("char(36)");
        builder.Property(x => x.ActionNote).HasMaxLength(1000);
        builder.Property(x => x.CreatedAt).HasColumnType("datetime");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime");

        builder.HasIndex(x => new { x.MemoId, x.SortOrder }).HasDatabaseName("ix_memo_step_instances_memo");

        builder.HasOne(x => x.Memo)
            .WithMany(m => m.StepInstances)
            .HasForeignKey(x => x.MemoId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.SourceStep)
            .WithMany()
            .HasForeignKey(x => x.SourceStepId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(x => x.AssigneeEmployee)
            .WithMany()
            .HasForeignKey(x => x.AssigneeEmployeeId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(x => x.ActedByEmployee)
            .WithMany()
            .HasForeignKey(x => x.ActedByEmployeeId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
