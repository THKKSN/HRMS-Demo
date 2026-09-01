namespace Hrms.Domain.Entities;

public class MemoMonthlySequence
{
    // yyyyMM — key รายเดือน
    public string SequenceMonth { get; set; } = string.Empty;
    public int LastNumber { get; set; }
}
