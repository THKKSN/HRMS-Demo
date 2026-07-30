using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public class TicketTopicConfiguration : IEntityTypeConfiguration<TicketTopic>
{
    public void Configure(EntityTypeBuilder<TicketTopic> builder)
    {
        builder.ToTable("ticket_topics");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");
        builder.Property(x => x.CompanyId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.DepartmentId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.CategoryId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.Name).HasMaxLength(100).IsRequired();
        builder.Property(x => x.Description).HasMaxLength(500);
        builder.Property(x => x.RoutingMode).HasConversion<string>().HasMaxLength(30);
        builder.Property(x => x.CreatedByEmployeeId).HasColumnType("char(36)");
        builder.Property(x => x.CreatedAt).HasColumnType("datetime");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime");

        builder.HasIndex(x => new { x.CategoryId, x.Name }).IsUnique();
        builder.HasIndex(x => new { x.DepartmentId, x.CategoryId, x.IsActive });

        builder.HasOne(x => x.Company)
            .WithMany()
            .HasForeignKey(x => x.CompanyId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Department)
            .WithMany()
            .HasForeignKey(x => x.DepartmentId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Category)
            .WithMany(x => x.Topics)
            .HasForeignKey(x => x.CategoryId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.CreatedByEmployee)
            .WithMany()
            .HasForeignKey(x => x.CreatedByEmployeeId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
