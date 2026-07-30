using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public class TicketStatusHistoryConfiguration : IEntityTypeConfiguration<TicketStatusHistory>
{
    public void Configure(EntityTypeBuilder<TicketStatusHistory> builder)
    {
        builder.ToTable("ticket_status_history");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");
        builder.Property(x => x.TicketId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.FromStatus).HasConversion<string>().HasMaxLength(30);
        builder.Property(x => x.ToStatus).HasConversion<string>().HasMaxLength(30);
        builder.Property(x => x.ChangedByEmployeeId).HasColumnType("char(36)");
        builder.Property(x => x.ChangedAt).HasColumnType("datetime");
        builder.Property(x => x.Reason).HasMaxLength(1000);
        builder.Property(x => x.AssignmentId).HasColumnType("char(36)");
        builder.Property(x => x.CreatedAt).HasColumnType("datetime");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime");

        builder.HasIndex(x => new { x.TicketId, x.ChangedAt });
        builder.HasIndex(x => new { x.ToStatus, x.ChangedAt });
        builder.HasOne(x => x.Ticket).WithMany(x => x.StatusHistory).HasForeignKey(x => x.TicketId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(x => x.ChangedByEmployee).WithMany().HasForeignKey(x => x.ChangedByEmployeeId).OnDelete(DeleteBehavior.SetNull);
        builder.HasOne(x => x.Assignment).WithMany().HasForeignKey(x => x.AssignmentId).OnDelete(DeleteBehavior.SetNull);
    }
}
