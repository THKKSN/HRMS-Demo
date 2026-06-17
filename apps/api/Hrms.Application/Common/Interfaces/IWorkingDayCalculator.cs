using Hrms.Domain.Enums;

namespace Hrms.Application.Common.Interfaces;

public interface IWorkingDayCalculator
{
    /// <summary>คำนวณจำนวนวันทำการตามกฎของบริษัท (workDays) ระหว่าง dateFrom ถึง dateTo
    /// HalfDay.Morning / Afternoon → คืน 0.5 เสมอ
    /// </summary>
    decimal Calculate(DateOnly dateFrom, DateOnly dateTo, HalfDayType halfDay, WorkDayFlags workDays);
}
