using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using System.Text.Json;

namespace Hrms.Infrastructure.Persistence.Configurations;

public class WeeklyHolidayScheduleConfiguration : IEntityTypeConfiguration<WeeklyHolidaySchedule>
{
    public void Configure(EntityTypeBuilder<WeeklyHolidaySchedule> builder)
    {
        builder.ToTable("weekly_holiday_schedules");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");
        builder.Property(x => x.CompanyId).HasColumnType("char(36)");
        builder.Property(x => x.Name).HasMaxLength(200).IsRequired();
        builder.Property(x => x.DayOfWeek).HasColumnType("tinyint").IsRequired();
        builder.Property(x => x.IsActive).HasColumnType("tinyint(1)");
        builder.Property(x => x.CreatedAt).HasColumnType("datetime");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime");

        // เก็บ List<int> เป็น JSON string ใน MySQL
        builder.Property(x => x.WorkDayOccurrences)
            .HasColumnType("json")
            .HasConversion(
                v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                v => JsonSerializer.Deserialize<List<int>>(v, (JsonSerializerOptions?)null) ?? new List<int>(),
                new ValueComparer<List<int>>(
                    (a, b) => a != null && b != null && a.SequenceEqual(b),
                    v => v.Aggregate(0, (h, e) => HashCode.Combine(h, e.GetHashCode())),
                    v => v.ToList()));

        builder.HasOne(x => x.Company)
               .WithMany()
               .HasForeignKey(x => x.CompanyId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
