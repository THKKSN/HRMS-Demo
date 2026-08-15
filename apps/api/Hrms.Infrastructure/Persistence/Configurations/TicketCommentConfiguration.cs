using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public class TicketCommentConfiguration : IEntityTypeConfiguration<TicketComment>
{
    public void Configure(EntityTypeBuilder<TicketComment> builder)
    {
        builder.ToTable("ticket_comments", table => table.HasCheckConstraint(
            "ck_ticket_comments_actor",
            "((employee_id IS NOT NULL AND external_reporter_id IS NULL) OR " +
            "(employee_id IS NULL AND external_reporter_id IS NOT NULL))"));
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");
        builder.Property(x => x.TicketId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.EmployeeId).HasColumnType("char(36)");
        builder.Property(x => x.ExternalReporterId).HasColumnType("char(36)");
        builder.Property(x => x.CommentType).HasConversion<string>().HasMaxLength(30);
        builder.Property(x => x.Message).HasMaxLength(2000).IsRequired();
        builder.Property(x => x.CreatedAt).HasColumnType("datetime");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime");

        builder.HasIndex(x => new { x.TicketId, x.CreatedAt });
        builder.HasIndex(x => x.EmployeeId);
        builder.HasIndex(x => x.ExternalReporterId);

        builder.HasOne(x => x.Ticket)
            .WithMany(x => x.Comments)
            .HasForeignKey(x => x.TicketId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(x => x.Employee)
            .WithMany()
            .HasForeignKey(x => x.EmployeeId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.ExternalReporter)
            .WithMany()
            .HasForeignKey(x => x.ExternalReporterId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
