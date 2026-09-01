using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public class MemoMonthlySequenceConfiguration : IEntityTypeConfiguration<MemoMonthlySequence>
{
    public void Configure(EntityTypeBuilder<MemoMonthlySequence> builder)
    {
        builder.ToTable("memo_monthly_sequences");
        builder.HasKey(x => x.SequenceMonth);
        builder.Property(x => x.SequenceMonth).HasColumnType("char(6)");
    }
}
