using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Tickets.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Tickets.Commands;

public record TriageTicketCommand(
    Guid TicketId,
    Guid CategoryId,
    Guid TopicId,
    string? OtherTopicText,
    TicketPriority Priority,
    string? LocationText,
    string? VehicleText,
    DateTime? ExpectedUpdatedAt) : IRequest<TicketActionResultDto>;

public class TriageTicketValidator : AbstractValidator<TriageTicketCommand>
{
    public TriageTicketValidator()
    {
        RuleFor(x => x.TicketId).NotEmpty();
        RuleFor(x => x.CategoryId).NotEmpty();
        RuleFor(x => x.TopicId).NotEmpty();
        RuleFor(x => x.OtherTopicText).MaximumLength(200);
        RuleFor(x => x.LocationText).MaximumLength(200);
        RuleFor(x => x.VehicleText).MaximumLength(100);
    }
}

public class TriageTicketHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissionService,
    IAuditLogService auditLog)
    : IRequestHandler<TriageTicketCommand, TicketActionResultDto>
{
    public async Task<TicketActionResultDto> Handle(TriageTicketCommand request, CancellationToken ct)
    {
        var ticket = await db.Tickets.FirstOrDefaultAsync(t => t.Id == request.TicketId, ct)
            ?? throw new KeyNotFoundException("ไม่พบใบแจ้งเรื่อง");
        await TicketSupervisorAccess.EnsureTicketAsync(
            db, currentUser, permissionService, "ticket:triage", ticket, ct);
        if (ticket.Status is not (TicketStatus.Open or TicketStatus.Assigned))
            throw new ConflictException("INVALID_TICKET_STATUS", "แก้การจัดประเภทได้เฉพาะสถานะ Open หรือ Assigned");
        TicketCommandSupport.EnsureExpectedVersion(ticket, request.ExpectedUpdatedAt);

        var category = await db.TicketCategories.FirstOrDefaultAsync(c =>
            c.Id == request.CategoryId &&
            c.CompanyId == ticket.TargetCompanyId &&
            c.DepartmentId == ticket.TargetDepartmentId &&
            c.IsActive, ct) ?? throw new FluentValidation.ValidationException("ไม่พบหมวดที่เปิดใช้งานในแผนกปลายทาง");
        var topic = await db.TicketTopics.FirstOrDefaultAsync(t =>
            t.Id == request.TopicId &&
            t.CategoryId == category.Id &&
            t.CompanyId == ticket.TargetCompanyId &&
            t.DepartmentId == ticket.TargetDepartmentId &&
            t.IsActive, ct) ?? throw new FluentValidation.ValidationException("ไม่พบหัวข้อย่อยที่เปิดใช้งานในหมวดนี้");

        var otherTopicText = TrimOrNull(request.OtherTopicText);
        if (topic.Name.Trim() == "อื่น ๆ" && otherTopicText is null)
            throw new FluentValidation.ValidationException("กรุณาระบุหัวข้ออื่น ๆ");

        var oldValues = new
        {
            ticket.CategoryId,
            ticket.TopicId,
            ticket.OtherTopicText,
            ticket.Priority,
            ticket.LocationText,
            ticket.VehicleText
        };
        ticket.CategoryId = category.Id;
        ticket.TopicId = topic.Id;
        ticket.OtherTopicText = topic.Name.Trim() == "อื่น ๆ" ? otherTopicText : null;
        ticket.Priority = request.Priority;
        ticket.LocationText = TrimOrNull(request.LocationText);
        ticket.VehicleText = TrimOrNull(request.VehicleText);
        ticket.UpdatedBy = currentUser.EmployeeId;
        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            "ticket", "Ticket", ticket.Id.ToString(), "triage",
            $"ปรับการจัดประเภทใบแจ้งเรื่อง {ticket.TicketNo}",
            oldValues,
            new { ticket.CategoryId, ticket.TopicId, ticket.OtherTopicText, ticket.Priority, ticket.LocationText, ticket.VehicleText },
            ct);

        return new TicketActionResultDto(ticket.Id, ticket.Status, ticket.UpdatedAt);
    }

    private static string? TrimOrNull(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
