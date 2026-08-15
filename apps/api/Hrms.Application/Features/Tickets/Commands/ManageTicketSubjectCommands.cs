using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Tickets.Dtos;
using Hrms.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Tickets.Commands;

public record CreateTicketSubjectCommand(
    Guid CompanyId,
    Guid DepartmentId,
    Guid CategoryId,
    Guid TopicId,
    string Name,
    string? Description,
    int SortOrder) : IRequest<TicketSubjectDto>;

public class CreateTicketSubjectValidator : AbstractValidator<CreateTicketSubjectCommand>
{
    public CreateTicketSubjectValidator()
    {
        RuleFor(x => x.CompanyId).NotEmpty();
        RuleFor(x => x.DepartmentId).NotEmpty();
        RuleFor(x => x.CategoryId).NotEmpty();
        RuleFor(x => x.TopicId).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Description).MaximumLength(500);
        RuleFor(x => x.SortOrder).InclusiveBetween(0, 9999);
    }
}

public class CreateTicketSubjectHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissionService,
    IAuditLogService auditLog)
    : IRequestHandler<CreateTicketSubjectCommand, TicketSubjectDto>
{
    public async Task<TicketSubjectDto> Handle(CreateTicketSubjectCommand request, CancellationToken ct)
    {
        await TicketManagementAccess.EnsureDepartmentAsync(
            db, currentUser, permissionService, "ticket:manage-topics", request.CompanyId, request.DepartmentId, ct);

        var topicExists = await db.TicketTopics.AnyAsync(t =>
            t.Id == request.TopicId &&
            t.CategoryId == request.CategoryId &&
            t.CompanyId == request.CompanyId &&
            t.DepartmentId == request.DepartmentId, ct);
        if (!topicExists) throw new KeyNotFoundException("ไม่พบหมวดย่อยที่ระบุ");

        var name = request.Name.Trim();
        if (await db.TicketSubjects.AnyAsync(s => s.TopicId == request.TopicId && s.Name == name, ct))
            throw new ConflictException("DUPLICATE_TICKET_SUBJECT", $"หัวข้อ '{name}' มีอยู่แล้วในหมวดย่อยนี้");

        var subject = new TicketSubject
        {
            CompanyId = request.CompanyId,
            DepartmentId = request.DepartmentId,
            CategoryId = request.CategoryId,
            TopicId = request.TopicId,
            Name = name,
            Description = TrimOrNull(request.Description),
            SortOrder = request.SortOrder,
            IsActive = true,
            CreatedByEmployeeId = currentUser.EmployeeId
        };
        db.TicketSubjects.Add(subject);
        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync("ticket", "TicketSubject", subject.Id.ToString(), "create",
            $"สร้างหัวข้อแจ้งเรื่อง '{subject.Name}'", null,
            new { subject.CompanyId, subject.DepartmentId, subject.CategoryId, subject.TopicId,
                subject.Name, subject.Description, subject.SortOrder }, ct);

        return ToDto(subject);
    }

    private static string? TrimOrNull(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    private static TicketSubjectDto ToDto(TicketSubject s) =>
        new(s.Id, s.CompanyId, s.DepartmentId, s.CategoryId, s.TopicId, s.Name, s.Description, s.SortOrder, s.IsActive);
}

public record UpdateTicketSubjectCommand(Guid Id, string Name, string? Description, int SortOrder, bool IsActive)
    : IRequest<TicketSubjectDto>;

public class UpdateTicketSubjectValidator : AbstractValidator<UpdateTicketSubjectCommand>
{
    public UpdateTicketSubjectValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Description).MaximumLength(500);
        RuleFor(x => x.SortOrder).InclusiveBetween(0, 9999);
    }
}

public class UpdateTicketSubjectHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissionService,
    IAuditLogService auditLog)
    : IRequestHandler<UpdateTicketSubjectCommand, TicketSubjectDto>
{
    public async Task<TicketSubjectDto> Handle(UpdateTicketSubjectCommand request, CancellationToken ct)
    {
        var subject = await db.TicketSubjects.FirstOrDefaultAsync(s => s.Id == request.Id, ct)
            ?? throw new KeyNotFoundException("ไม่พบหัวข้อที่ระบุ");
        await TicketManagementAccess.EnsureDepartmentAsync(
            db, currentUser, permissionService, "ticket:manage-topics", subject.CompanyId, subject.DepartmentId, ct);

        var name = request.Name.Trim();
        if (await db.TicketSubjects.AnyAsync(s => s.TopicId == subject.TopicId && s.Name == name && s.Id != subject.Id, ct))
            throw new ConflictException("DUPLICATE_TICKET_SUBJECT", $"หัวข้อ '{name}' มีอยู่แล้วในหมวดย่อยนี้");

        var oldValues = new { subject.Name, subject.Description, subject.SortOrder, subject.IsActive };
        subject.Name = name;
        subject.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        subject.SortOrder = request.SortOrder;
        subject.IsActive = request.IsActive;
        subject.UpdatedAt = DateTime.UtcNow.AddHours(7);
        subject.UpdatedBy = currentUser.EmployeeId;
        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync("ticket", "TicketSubject", subject.Id.ToString(), "update",
            $"แก้ไขหัวข้อแจ้งเรื่อง '{subject.Name}'", oldValues,
            new { subject.Name, subject.Description, subject.SortOrder, subject.IsActive }, ct);

        return new TicketSubjectDto(subject.Id, subject.CompanyId, subject.DepartmentId, subject.CategoryId,
            subject.TopicId, subject.Name, subject.Description, subject.SortOrder, subject.IsActive);
    }
}
