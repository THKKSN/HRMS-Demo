using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public class TicketWorkflowDefinitionConfiguration : IEntityTypeConfiguration<TicketWorkflowDefinition>
{
    public void Configure(EntityTypeBuilder<TicketWorkflowDefinition> builder)
    {
        builder.ToTable("ticket_workflow_definitions");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");
        builder.Property(x => x.CompanyId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.DepartmentId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.Code).HasMaxLength(100).IsRequired();
        builder.Property(x => x.Name).HasMaxLength(200).IsRequired();
        builder.Property(x => x.Description).HasMaxLength(1000);
        builder.Property(x => x.BoardStepsJson).HasColumnType("longtext").IsRequired();
        builder.Property(x => x.InProgressPresetsJson).HasColumnType("longtext").IsRequired();
        builder.Property(x => x.ActionsJson).HasColumnType("longtext").IsRequired();
        builder.Property(x => x.StepsJson).HasColumnType("longtext").IsRequired();
        builder.Property(x => x.StatusStepMapJson).HasColumnType("longtext").IsRequired();
        builder.Property(x => x.CreatedAt).HasColumnType("datetime");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime");

        builder.HasIndex(x => new { x.CompanyId, x.DepartmentId, x.Code }).IsUnique();
        builder.HasIndex(x => new { x.CompanyId, x.DepartmentId, x.IsActive });

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
