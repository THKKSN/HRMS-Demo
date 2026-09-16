using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public class MemoWorkflowStepConfiguration : IEntityTypeConfiguration<MemoWorkflowStep>
{
    public void Configure(EntityTypeBuilder<MemoWorkflowStep> builder)
    {
        builder.ToTable("memo_workflow_steps");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");
        builder.Property(x => x.MemoTypeId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.SortOrder).IsRequired();
        builder.Property(x => x.Label).HasMaxLength(200).IsRequired();
        builder.Property(x => x.StepKind).HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(x => x.AssigneeRoleCode).HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(x => x.AssigneeEmployeeId).HasColumnType("char(36)");
        builder.Property(x => x.IsActive).HasColumnType("tinyint(1)");
        builder.Property(x => x.CreatedAt).HasColumnType("datetime");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime");

        builder.HasIndex(x => new { x.MemoTypeId, x.IsActive }).HasDatabaseName("ix_memo_workflow_steps_memo_type");

        builder.HasOne(x => x.MemoType)
            .WithMany(t => t.WorkflowSteps)
            .HasForeignKey(x => x.MemoTypeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.AssigneeEmployee)
            .WithMany()
            .HasForeignKey(x => x.AssigneeEmployeeId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
