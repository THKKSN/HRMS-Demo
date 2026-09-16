using Hangfire;
using Hrms.Application.Common.Options;
using Hrms.Application.Features.Tickets;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using Hrms.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Hrms.Infrastructure.Jobs;

/// <summary>
/// ปิดใบที่รอผู้แจ้งกดยืนยันนานเกินกำหนดให้เอง
///
/// จำนวนวันมาจาก snapshot บนใบ (Ticket.WorkflowAutoAcknowledgeAfterDays) ถ้าใบนั้นไม่มี
/// ให้ใช้ Ticket:AutoAcknowledgeAfterDaysDefault จาก appsettings แทน — เดิม job กรอง
/// snapshot ที่เป็น null ออก ใบที่สร้างขึ้นตอนยังไม่มี workflow ผูกไว้จึงค้างถาวร
/// </summary>
[AutomaticRetry(Attempts = 0)]
public class TicketAutoConfirmationJob(
    HrmsDbContext db,
    IOptions<TicketOptions> ticketOptions,
    ILogger<TicketAutoConfirmationJob> logger)
{
    public async Task RunAsync(CancellationToken ct = default)
    {
        var now = DateTime.UtcNow.AddHours(7);
        var fallbackDays = Math.Max(1, ticketOptions.Value.AutoAcknowledgeAfterDaysDefault);
        var tickets = await db.Tickets
            .Include(ticket => ticket.Assignments.Where(assignment => assignment.IsActive && assignment.IsPrimary))
            .Where(ticket => ticket.Status == TicketStatus.AwaitingRequesterConfirmation
                && ticket.VerifiedAt != null)
            .ToListAsync(ct);

        var dueTickets = tickets.Where(ticket =>
            ticket.VerifiedAt!.Value.AddDays(
                ticket.WorkflowAutoAcknowledgeAfterDays is > 0 and int days ? days : fallbackDays) <= now).ToList();
        foreach (var ticket in dueTickets)
        {
            var assignment = ticket.Assignments.FirstOrDefault();
            if (assignment is not null)
            {
                assignment.IsActive = false;
                assignment.ActiveSlot = null;
                assignment.EndedAt = now;
                assignment.EndedByEmployeeId = ticket.VerifiedByEmployeeId;
            }
            ticket.Status = TicketStatus.Closed;
            ticket.ClosedByEmployeeId = ticket.VerifiedByEmployeeId;
            ticket.ClosedAt = now;
            ticket.WorkflowCurrentStepKey = "closed";
            ticket.CurrentWorkState = "Automatically confirmed after requester confirmation period";
            ticket.CurrentBlockerReason = null;
            ticket.CurrentNextAction = null;
            if (ticket.VerifiedByEmployeeId.HasValue)
            {
                db.TicketProgressEntries.Add(new TicketProgressEntry
                {
                    TicketId = ticket.Id,
                    WorkflowStepKey = "closed",
                    WorkState = "Automatically confirmed after requester confirmation period",
                    CreatedByEmployeeId = ticket.VerifiedByEmployeeId.Value,
                    CreatedBy = ticket.VerifiedByEmployeeId.Value,
                    UpdatedBy = ticket.VerifiedByEmployeeId.Value,
                });
            }
            db.TicketStatusHistory.Add(new TicketStatusHistory
            {
                TicketId = ticket.Id,
                FromStatus = TicketStatus.AwaitingRequesterConfirmation,
                ToStatus = TicketStatus.Closed,
                ChangedByEmployeeId = ticket.VerifiedByEmployeeId,
                ChangedAt = now,
                Reason = "AutoRequesterConfirmation",
                AssignmentId = assignment?.Id,
                CreatedBy = ticket.VerifiedByEmployeeId,
                UpdatedBy = ticket.VerifiedByEmployeeId,
            });
        }

        if (dueTickets.Count == 0) return;
        await db.SaveChangesAsync(ct);
        logger.LogInformation("Automatically confirmed {TicketCount} ticket(s)", dueTickets.Count);
    }
}
