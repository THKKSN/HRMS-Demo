using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public class TicketAssignmentConfiguration : IEntityTypeConfiguration<TicketAssignment>
{
    public void Configure(EntityTypeBuilder<TicketAssignment> builder)
    {
        builder.ToTable("ticket_assignments");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");
        builder.Property(x => x.TicketId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.AssignedToEmployeeId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.AssignedByEmployeeId).HasColumnType("char(36)");
        builder.Property(x => x.AssignedAt).HasColumnType("datetime");
        builder.Property(x => x.EndedAt).HasColumnType("datetime");
        builder.Property(x => x.EndedByEmployeeId).HasColumnType("char(36)");
        builder.Property(x => x.ActiveSlot).HasMaxLength(20);
        builder.Property(x => x.Note).HasMaxLength(1000);
        builder.Property(x => x.AssignmentSource).HasConversion<string>().HasMaxLength(30);
        builder.Property(x => x.ResponsibilityId).HasColumnType("char(36)");
        builder.Property(x => x.RoutingLevelSnapshot).HasConversion<string>().HasMaxLength(20);
        builder.Property(x => x.CreatedAt).HasColumnType("datetime");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime");

        builder.HasIndex(x => new { x.TicketId, x.IsActive, x.IsPrimary });
        builder.HasIndex(x => new { x.TicketId, x.ActiveSlot }).IsUnique();
        builder.HasIndex(x => new { x.AssignedToEmployeeId, x.IsActive });
        builder.HasIndex(x => x.AssignedByEmployeeId);
        builder.HasIndex(x => x.EndedByEmployeeId);
        builder.HasIndex(x => x.ResponsibilityId);

        builder.HasOne(x => x.Ticket)
            .WithMany(x => x.Assignments)
            .HasForeignKey(x => x.TicketId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.AssignedToEmployee)
            .WithMany()
            .HasForeignKey(x => x.AssignedToEmployeeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.AssignedByEmployee)
            .WithMany()
            .HasForeignKey(x => x.AssignedByEmployeeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.EndedByEmployee)
            .WithMany()
            .HasForeignKey(x => x.EndedByEmployeeId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(x => x.Responsibility)
            .WithMany(x => x.Assignments)
            .HasForeignKey(x => x.ResponsibilityId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
