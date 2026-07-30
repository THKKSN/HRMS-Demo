namespace Hrms.Domain.Entities;

public class TicketDailySequence
{
    public DateOnly SequenceDate { get; set; }
    public int LastNumber { get; set; }
}
