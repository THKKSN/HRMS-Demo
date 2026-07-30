using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public class TicketDailySequenceConfiguration : IEntityTypeConfiguration<TicketDailySequence>
{
    public void Configure(EntityTypeBuilder<TicketDailySequence> builder)
    {
        builder.ToTable("ticket_daily_sequences");
        builder.HasKey(x => x.SequenceDate);
        builder.Property(x => x.SequenceDate).HasColumnType("date");
    }
}
