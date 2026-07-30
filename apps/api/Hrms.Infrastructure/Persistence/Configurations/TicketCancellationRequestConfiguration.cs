using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public class TicketCancellationRequestConfiguration : IEntityTypeConfiguration<TicketCancellationRequest>
{
    public void Configure(EntityTypeBuilder<TicketCancellationRequest> builder)
    {
        builder.ToTable("ticket_cancellation_requests");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");
        builder.Property(x => x.TicketId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.RequestedByEmployeeId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.Reason).HasMaxLength(1000).IsRequired();
        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(x => x.PendingSlot).HasMaxLength(20);
        builder.Property(x => x.RequestedAt).HasColumnType("datetime");
        builder.Property(x => x.ReviewedByEmployeeId).HasColumnType("char(36)");
        builder.Property(x => x.ReviewedAt).HasColumnType("datetime");
        builder.Property(x => x.ReviewNote).HasMaxLength(1000);
        builder.Property(x => x.CreatedAt).HasColumnType("datetime");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime");

        builder.HasIndex(x => new { x.TicketId, x.PendingSlot }).IsUnique();
        builder.HasIndex(x => new { x.Status, x.RequestedAt });

        builder.HasOne(x => x.Ticket)
            .WithMany(x => x.CancellationRequests)
            .HasForeignKey(x => x.TicketId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(x => x.RequestedByEmployee)
            .WithMany()
            .HasForeignKey(x => x.RequestedByEmployeeId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.ReviewedByEmployee)
            .WithMany()
            .HasForeignKey(x => x.ReviewedByEmployeeId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
