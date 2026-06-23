using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public class AttendanceRecordConfiguration : IEntityTypeConfiguration<AttendanceRecord>
{
    public void Configure(EntityTypeBuilder<AttendanceRecord> builder)
    {
        builder.ToTable("attendance_records");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");
        builder.Property(x => x.EmployeeId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.LocationId).HasColumnType("char(36)");
        builder.Property(x => x.Date).HasColumnType("date").IsRequired();
        builder.Property(x => x.CheckInTime).HasColumnType("datetime");
        builder.Property(x => x.CheckOutTime).HasColumnType("datetime");
        builder.Property(x => x.CheckInLatitude).HasColumnType("double");
        builder.Property(x => x.CheckInLongitude).HasColumnType("double");
        builder.Property(x => x.CheckOutLatitude).HasColumnType("double");
        builder.Property(x => x.CheckOutLongitude).HasColumnType("double");
        builder.Property(x => x.CheckInSelfieUrl).HasMaxLength(500);
        builder.Property(x => x.CheckOutSelfieUrl).HasMaxLength(500);
        builder.Property(x => x.IsLate).HasColumnType("tinyint(1)");
        builder.Property(x => x.LateMinutes).HasDefaultValue(0);
        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(x => x.Remark).HasMaxLength(500);
        builder.Property(x => x.CreatedAt).HasColumnType("datetime");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime");

        builder.HasIndex(x => new { x.EmployeeId, x.Date })
               .IsUnique()
               .HasDatabaseName("ix_attendance_records_employee_date");

        builder.HasOne(x => x.Employee)
               .WithMany(e => e.AttendanceRecords)
               .HasForeignKey(x => x.EmployeeId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Location)
               .WithMany()
               .HasForeignKey(x => x.LocationId)
               .OnDelete(DeleteBehavior.SetNull);
    }
}
