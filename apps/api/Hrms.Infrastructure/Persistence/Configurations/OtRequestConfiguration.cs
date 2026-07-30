using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public class OtRequestConfiguration : IEntityTypeConfiguration<OtRequest>
{
    public void Configure(EntityTypeBuilder<OtRequest> builder)
    {
        builder.ToTable("ot_requests");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");
        builder.Property(x => x.EmployeeId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.TotalHours).HasColumnType("decimal(5,2)");
        builder.Property(x => x.RateType).HasConversion<string>().HasMaxLength(20);
        builder.Property(x => x.Reason).HasMaxLength(500);
        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(30);
        builder.Property(x => x.SupervisorId).HasColumnType("char(36)");
        builder.Property(x => x.SupervisorComment).HasMaxLength(500);
        builder.Property(x => x.SupervisorApprovedAt).HasColumnType("datetime");
        builder.Property(x => x.HrId).HasColumnType("char(36)");
        builder.Property(x => x.HrComment).HasMaxLength(500);
        builder.Property(x => x.HrAcknowledgedAt).HasColumnType("datetime");
        builder.Property(x => x.CreatedAt).HasColumnType("datetime");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime");

        builder.HasIndex(x => new { x.EmployeeId, x.Date });
        builder.HasIndex(x => new { x.Status, x.SupervisorId });

        builder.HasOne(x => x.Employee)
            .WithMany(x => x.OtRequests)
            .HasForeignKey(x => x.EmployeeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Supervisor)
            .WithMany()
            .HasForeignKey(x => x.SupervisorId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(x => x.Hr)
            .WithMany()
            .HasForeignKey(x => x.HrId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
