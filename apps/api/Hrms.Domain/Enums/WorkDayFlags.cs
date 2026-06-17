namespace Hrms.Domain.Enums;

[Flags]
public enum WorkDayFlags
{
    None      = 0,
    Monday    = 1 << 0,  // 1
    Tuesday   = 1 << 1,  // 2
    Wednesday = 1 << 2,  // 4
    Thursday  = 1 << 3,  // 8
    Friday    = 1 << 4,  // 16
    Saturday  = 1 << 5,  // 32
    Sunday    = 1 << 6,  // 64

    MonToFri  = Monday | Tuesday | Wednesday | Thursday | Friday,        // 31
    MonToSat  = Monday | Tuesday | Wednesday | Thursday | Friday | Saturday, // 63
}
