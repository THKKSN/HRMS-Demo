using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using Hrms.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace Hrms.Application.Tests.Support;

internal sealed class TicketTestFixture : IAsyncDisposable
{
    public Guid CompanyId { get; } = Guid.NewGuid();
    public Guid SourceDepartmentId { get; } = Guid.NewGuid();
    public Guid TargetDepartmentId { get; } = Guid.NewGuid();
    public Guid RequesterId { get; } = Guid.NewGuid();
    public Guid AssigneeId { get; } = Guid.NewGuid();
    public Guid SupervisorId { get; } = Guid.NewGuid();
    public Guid OutsiderId { get; } = Guid.NewGuid();
    public Guid CategoryId { get; } = Guid.NewGuid();
    public Guid TopicId { get; } = Guid.NewGuid();
    public HrmsDbContext Db { get; }

    public TicketTestFixture()
    {
        var options = new DbContextOptionsBuilder<HrmsDbContext>()
            .UseInMemoryDatabase($"ticket-tests-{Guid.NewGuid():N}")
            .ConfigureWarnings(warnings =>
                warnings.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        Db = new HrmsDbContext(options);
    }

    public async Task SeedOrganizationAsync(
        TicketRoutingMode categoryMode = TicketRoutingMode.SupervisorAssign,
        TicketRoutingMode topicMode = TicketRoutingMode.SupervisorAssign)
    {
        Db.Companies.Add(new Company
        {
            Id = CompanyId,
            Name = "Test Company",
            IsActive = true,
            IsHeadquarters = true
        });
        Db.Departments.AddRange(
            new Department
            {
                Id = SourceDepartmentId,
                CompanyId = CompanyId,
                Name = "Driver",
                IsActive = true
            },
            new Department
            {
                Id = TargetDepartmentId,
                CompanyId = CompanyId,
                Name = "IT",
                ManagerEmployeeId = SupervisorId,
                IsActive = true
            });
        Db.Employees.AddRange(
            Employee(RequesterId, SourceDepartmentId, "Requester", "line-requester"),
            Employee(AssigneeId, TargetDepartmentId, "Assignee", "line-assignee"),
            Employee(SupervisorId, TargetDepartmentId, "Supervisor", "line-supervisor"),
            Employee(OutsiderId, SourceDepartmentId, "Outsider", "line-outsider"));
        Db.TicketCategories.Add(new TicketCategory
        {
            Id = CategoryId,
            CompanyId = CompanyId,
            DepartmentId = TargetDepartmentId,
            Name = "Hardware",
            IsActive = true,
            RoutingMode = categoryMode
        });
        Db.TicketTopics.Add(new TicketTopic
        {
            Id = TopicId,
            CompanyId = CompanyId,
            DepartmentId = TargetDepartmentId,
            CategoryId = CategoryId,
            Name = "Camera",
            IsActive = true,
            RoutingMode = topicMode
        });
        await Db.SaveChangesAsync();
        Db.ChangeTracker.Clear();
    }

    public async Task<Ticket> AddTicketAsync(
        TicketStatus status = TicketStatus.Open,
        bool activeAssignment = false)
    {
        var ticket = new Ticket
        {
            TicketNo = $"TK-TEST-{Guid.NewGuid():N}"[..20],
            RequesterEmployeeId = RequesterId,
            SourceCompanyId = CompanyId,
            SourceDepartmentId = SourceDepartmentId,
            TargetCompanyId = CompanyId,
            TargetDepartmentId = TargetDepartmentId,
            CategoryId = CategoryId,
            TopicId = TopicId,
            Title = "Camera adhesive",
            Detail = "Camera adhesive is loose",
            Status = status,
            Priority = TicketPriority.Medium
        };
        Db.Tickets.Add(ticket);
        if (activeAssignment)
        {
            Db.TicketAssignments.Add(new TicketAssignment
            {
                TicketId = ticket.Id,
                AssignedToEmployeeId = AssigneeId,
                AssignedByEmployeeId = SupervisorId,
                AssignedAt = DateTime.UtcNow.AddHours(7),
                IsPrimary = true,
                IsActive = true,
                ActiveSlot = "Primary",
                AssignmentSource = TicketAssignmentSource.Manual
            });
        }
        await Db.SaveChangesAsync();
        Db.ChangeTracker.Clear();
        return await Db.Tickets.FirstAsync(x => x.Id == ticket.Id);
    }

    public Employee Employee(Guid id, Guid departmentId, string firstName, string? lineUserId)
        => new()
        {
            Id = id,
            CompanyId = CompanyId,
            DepartmentId = departmentId,
            EmployeeCode = id.ToString("N")[..8],
            FirstName = firstName,
            LastName = "Test",
            LineUserId = lineUserId,
            IsActive = true
        };

    public async ValueTask DisposeAsync() => await Db.DisposeAsync();
}
