using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public class TicketSubjectGuidanceConfigConfiguration : IEntityTypeConfiguration<TicketSubjectGuidanceConfig>
{
    public void Configure(EntityTypeBuilder<TicketSubjectGuidanceConfig> builder)
    {
        builder.ToTable("ticket_subject_guidance_configs");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");
        builder.Property(x => x.CompanyId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.DepartmentId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.CategoryId).HasColumnType("char(36)");
        builder.Property(x => x.TopicId).HasColumnType("char(36)");
        builder.Property(x => x.SubjectId).HasColumnType("char(36)");
        builder.Property(x => x.WorkflowDefinitionId).HasColumnType("char(36)");
        builder.Property(x => x.Name).HasMaxLength(200).IsRequired();
        builder.Property(x => x.SuggestionTargetLabel).HasMaxLength(100);
        builder.Property(x => x.SuggestionsJson).HasColumnType("longtext").IsRequired();
        builder.Property(x => x.Template).HasColumnType("longtext").IsRequired();
        builder.Property(x => x.CreatedAt).HasColumnType("datetime");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime");

        builder.HasIndex(x => new { x.CompanyId, x.DepartmentId, x.IsActive });
        builder.HasIndex(x => new { x.CompanyId, x.DepartmentId, x.Priority });

        builder.HasOne(x => x.Company)
            .WithMany()
            .HasForeignKey(x => x.CompanyId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Department)
            .WithMany()
            .HasForeignKey(x => x.DepartmentId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Category)
            .WithMany()
            .HasForeignKey(x => x.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Topic)
            .WithMany()
            .HasForeignKey(x => x.TopicId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Subject)
            .WithMany()
            .HasForeignKey(x => x.SubjectId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.WorkflowDefinition)
            .WithMany(x => x.SubjectGuidanceConfigs)
            .HasForeignKey(x => x.WorkflowDefinitionId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
