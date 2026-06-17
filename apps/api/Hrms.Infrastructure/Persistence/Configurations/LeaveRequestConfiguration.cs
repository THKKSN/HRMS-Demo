using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public class LeaveRequestConfiguration : IEntityTypeConfiguration<LeaveRequest>
{
    public void Configure(EntityTypeBuilder<LeaveRequest> builder)
    {
        builder.ToTable("leave_requests");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");
        builder.Property(x => x.EmployeeId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.LeaveTypeId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.HalfDay).HasConversion<string>().HasMaxLength(20);
        builder.Property(x => x.TotalDays).HasColumnType("decimal(5,1)");
        builder.Property(x => x.Reason).HasMaxLength(500);
        builder.Property(x => x.AttachmentUrl).HasMaxLength(500);
        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(30);
        builder.Property(x => x.SupervisorId).HasColumnType("char(36)");
        builder.Property(x => x.HrId).HasColumnType("char(36)");
        builder.Property(x => x.SupervisorComment).HasMaxLength(500);
        builder.Property(x => x.HrComment).HasMaxLength(500);
        builder.Property(x => x.SupervisorApprovedAt).HasColumnType("datetime");
        builder.Property(x => x.HrApprovedAt).HasColumnType("datetime");
        builder.Property(x => x.CreatedAt).HasColumnType("datetime");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime");

        builder.HasIndex(x => new { x.EmployeeId, x.Status });
        builder.HasIndex(x => new { x.Status, x.SupervisorId });

        builder.HasOne(x => x.Employee)
            .WithMany(x => x.LeaveRequests)
            .HasForeignKey(x => x.EmployeeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.LeaveType)
            .WithMany()
            .HasForeignKey(x => x.LeaveTypeId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
