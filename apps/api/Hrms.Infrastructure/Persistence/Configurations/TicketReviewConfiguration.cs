using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public class TicketReviewConfiguration : IEntityTypeConfiguration<TicketReview>
{
    public void Configure(EntityTypeBuilder<TicketReview> builder)
    {
        builder.ToTable("ticket_reviews");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");
        builder.Property(x => x.TicketId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.Decision).HasConversion<string>().HasMaxLength(20);
        builder.Property(x => x.ReviewNote).HasMaxLength(2000);
        builder.Property(x => x.ReviewedByEmployeeId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.ReviewedAt).HasColumnType("datetime");
        builder.Property(x => x.ResolvedByEmployeeId).HasColumnType("char(36)");
        builder.Property(x => x.ResolvedAt).HasColumnType("datetime");
        builder.Property(x => x.ProblemTypeSnapshot).HasConversion<string>().HasMaxLength(30);
        builder.Property(x => x.InitialInspectionSnapshot).HasMaxLength(2000);
        builder.Property(x => x.ResolutionSnapshot).HasMaxLength(2000);
        builder.Property(x => x.ResolvedAttachmentIdsJson).HasMaxLength(4000).IsRequired();
        builder.Property(x => x.CreatedAt).HasColumnType("datetime");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime");

        builder.HasIndex(x => new { x.TicketId, x.ReviewRound }).IsUnique();
        builder.HasIndex(x => new { x.Decision, x.ReviewedAt });
        builder.HasOne(x => x.Ticket).WithMany(x => x.Reviews).HasForeignKey(x => x.TicketId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(x => x.ReviewedByEmployee).WithMany().HasForeignKey(x => x.ReviewedByEmployeeId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.ResolvedByEmployee).WithMany().HasForeignKey(x => x.ResolvedByEmployeeId).OnDelete(DeleteBehavior.SetNull);
    }
}
