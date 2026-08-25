using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public class ExternalTicketSubjectConfiguration : IEntityTypeConfiguration<ExternalTicketSubject>
{
    public void Configure(EntityTypeBuilder<ExternalTicketSubject> builder)
    {
        builder.ToTable("external_ticket_subjects");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");
        builder.Property(x => x.ExternalTicketTopicId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.Name).HasMaxLength(200).IsRequired();
        builder.Property(x => x.Description).HasMaxLength(500);
        builder.Property(x => x.Template).HasMaxLength(2000);
        builder.Property(x => x.SuggestionsJson).HasMaxLength(2000).HasDefaultValue("[]");
        builder.Property(x => x.CreatedAt).HasColumnType("datetime");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime");

        builder.HasIndex(x => new { x.ExternalTicketTopicId, x.Name }).IsUnique();
        builder.HasIndex(x => new { x.ExternalTicketTopicId, x.IsActive, x.SortOrder });

        builder.HasOne(x => x.Topic)
            .WithMany(x => x.Subjects)
            .HasForeignKey(x => x.ExternalTicketTopicId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
