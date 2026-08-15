using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public class TicketAttachmentConfiguration : IEntityTypeConfiguration<TicketAttachment>
{
    public void Configure(EntityTypeBuilder<TicketAttachment> builder)
    {
        builder.ToTable("ticket_attachments");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");
        builder.Property(x => x.TicketId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.TicketProgressEntryId).HasColumnType("char(36)");
        builder.Property(x => x.UploadedByEmployeeId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.Url).HasMaxLength(500).IsRequired();
        builder.Property(x => x.FileName).HasMaxLength(255);
        builder.Property(x => x.ContentType).HasMaxLength(100);
        builder.Property(x => x.Stage).HasConversion<string>().HasMaxLength(20);
        builder.Property(x => x.Visibility)
            .HasConversion<string>()
            .HasMaxLength(20)
            .HasDefaultValue(Hrms.Domain.Enums.TicketAttachmentVisibility.Public);
        builder.Property(x => x.StorageKey).HasMaxLength(500);
        builder.Property(x => x.CreatedAt).HasColumnType("datetime");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime");

        builder.HasIndex(x => new { x.TicketId, x.Stage });
        builder.HasIndex(x => x.TicketProgressEntryId);

        builder.HasOne(x => x.Ticket)
            .WithMany(x => x.Attachments)
            .HasForeignKey(x => x.TicketId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.UploadedByEmployee)
            .WithMany()
            .HasForeignKey(x => x.UploadedByEmployeeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.TicketProgressEntry)
            .WithMany(x => x.Attachments)
            .HasForeignKey(x => x.TicketProgressEntryId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
