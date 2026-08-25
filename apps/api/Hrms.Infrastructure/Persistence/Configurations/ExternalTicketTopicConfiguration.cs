using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public class ExternalTicketTopicConfiguration : IEntityTypeConfiguration<ExternalTicketTopic>
{
    public void Configure(EntityTypeBuilder<ExternalTicketTopic> builder)
    {
        builder.ToTable("external_ticket_topics");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");
        builder.Property(x => x.ExternalTicketCategoryId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.Name).HasMaxLength(100).IsRequired();
        builder.Property(x => x.Description).HasMaxLength(500);
        builder.Property(x => x.CreatedAt).HasColumnType("datetime");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime");

        builder.HasIndex(x => new { x.ExternalTicketCategoryId, x.Name }).IsUnique();
        builder.HasIndex(x => new { x.ExternalTicketCategoryId, x.IsActive, x.SortOrder });

        builder.HasOne(x => x.Category)
            .WithMany(x => x.Topics)
            .HasForeignKey(x => x.ExternalTicketCategoryId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
