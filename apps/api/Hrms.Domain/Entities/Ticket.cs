using Hrms.Domain.Common;
using Hrms.Domain.Enums;

namespace Hrms.Domain.Entities;

public class Ticket : BaseEntity
{
    public string TicketNo { get; set; } = string.Empty;
    public TicketRequestType RequestType { get; set; } = TicketRequestType.Internal;
    public Guid? RequesterEmployeeId { get; set; }
    public Guid? ExternalReporterId { get; set; }
    public Guid? SourceCompanyId { get; set; }
    public Guid? SourceDepartmentId { get; set; }
    public Guid TargetCompanyId { get; set; }
    public Guid? TargetDepartmentId { get; set; }
    public Guid? CategoryId { get; set; }
    public Guid? TopicId { get; set; }
    public Guid? SubjectId { get; set; }
    public Guid? ExternalTicketCategoryId { get; set; }
    public Guid? ExternalTicketTopicId { get; set; }
    public Guid? ExternalTicketSubjectId { get; set; }
    public Guid? WorkflowDefinitionId { get; set; }
    public Guid? SubjectGuidanceConfigId { get; set; }
    public string? OtherTopicText { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Detail { get; set; } = string.Empty;
    public string? WorkflowName { get; set; }
    public string? WorkflowStepsJson { get; set; }
    public string? WorkflowStatusStepMapJson { get; set; }
    public string? WorkflowBoardStepsJson { get; set; }
    public string? WorkflowInProgressPresetsJson { get; set; }
    public string? WorkflowActionsJson { get; set; }
    public int? WorkflowAutoAcknowledgeAfterDays { get; set; }
    public string? WorkflowCurrentStepKey { get; set; }
    public string? CurrentWorkState { get; set; }
    public string? CurrentBlockerReason { get; set; }
    public string? CurrentNextAction { get; set; }
    public string? SubjectGuidanceConfigName { get; set; }
    public TicketPriority Priority { get; set; } = TicketPriority.Medium;
    public TicketStatus Status { get; set; } = TicketStatus.Open;
    public TicketSourceChannel SourceChannel { get; set; } = TicketSourceChannel.Unknown;
    public string? SourceClientApp { get; set; }
    public TicketRoutingMode RoutingMode { get; set; } = TicketRoutingMode.SupervisorAssign;
    public TicketRoutingLevel RoutingLevel { get; set; } = TicketRoutingLevel.None;
    public TicketRoutingOutcome RoutingOutcome { get; set; } = TicketRoutingOutcome.NotEvaluated;
    public long Version { get; set; } = 1;
    public string? VehicleText { get; set; }
    public string? LocationText { get; set; }
    public string? ContactPhone { get; set; }
    public string? ContactNote { get; set; }
    public string? RequesterNameSnapshot { get; set; }
    public string? RequesterNicknameSnapshot { get; set; }
    public string? RequesterPhoneSnapshot { get; set; }
    public string? RequesterEmailSnapshot { get; set; }
    public string? RequesterOrganizationSnapshot { get; set; }
    public string? RequesterLineDisplayNameSnapshot { get; set; }
    public Guid? ReceiverEmployeeId { get; set; }
    public Guid? SupervisorAcceptedByEmployeeId { get; set; }
    public DateTime? SupervisorAcceptedAt { get; set; }
    public Guid? WorkStartedByEmployeeId { get; set; }
    public DateTime? WorkStartedAt { get; set; }
    public Guid? WaitingInfoByEmployeeId { get; set; }
    public DateTime? WaitingInfoAt { get; set; }
    public TicketProblemType? ProblemType { get; set; }
    public string? InitialInspectionNote { get; set; }
    public string? ResolutionNote { get; set; }
    public Guid? ResolvedByEmployeeId { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public Guid? ClosedByEmployeeId { get; set; }
    public Guid? ClosedByExternalReporterId { get; set; }
    public DateTime? ClosedAt { get; set; }
    public Guid? VerifiedByEmployeeId { get; set; }
    public DateTime? VerifiedAt { get; set; }
    public Guid? RejectedByEmployeeId { get; set; }
    public DateTime? RejectedAt { get; set; }
    public string? RejectionReason { get; set; }
    public Guid? CancelledByEmployeeId { get; set; }
    public DateTime? CancelledAt { get; set; }
    public string? CancellationReason { get; set; }

    public Employee? RequesterEmployee { get; set; }
    public ExternalReporter? ExternalReporter { get; set; }
    public Company? SourceCompany { get; set; }
    public Department? SourceDepartment { get; set; }
    public Company TargetCompany { get; set; } = null!;
    public Department? TargetDepartment { get; set; }
    public TicketCategory? Category { get; set; }
    public TicketTopic? Topic { get; set; }
    public TicketSubject? Subject { get; set; }
    public ExternalTicketCategory? ExternalTicketCategory { get; set; }
    public ExternalTicketTopic? ExternalTicketTopic { get; set; }
    public ExternalTicketSubject? ExternalTicketSubject { get; set; }
    public TicketWorkflowDefinition? WorkflowDefinition { get; set; }
    public TicketSubjectGuidanceConfig? SubjectGuidanceConfig { get; set; }
    public Employee? ReceiverEmployee { get; set; }
    public Employee? SupervisorAcceptedByEmployee { get; set; }
    public Employee? WorkStartedByEmployee { get; set; }
    public Employee? WaitingInfoByEmployee { get; set; }
    public Employee? ResolvedByEmployee { get; set; }
    public Employee? ClosedByEmployee { get; set; }
    public ExternalReporter? ClosedByExternalReporter { get; set; }
    public Employee? VerifiedByEmployee { get; set; }
    public Employee? RejectedByEmployee { get; set; }
    public Employee? CancelledByEmployee { get; set; }
    public ICollection<TicketAttachment> Attachments { get; set; } = new List<TicketAttachment>();
    public ICollection<TicketAssignment> Assignments { get; set; } = new List<TicketAssignment>();
    public ICollection<TicketComment> Comments { get; set; } = new List<TicketComment>();
    public ICollection<TicketReview> Reviews { get; set; } = new List<TicketReview>();
    public ICollection<TicketStatusHistory> StatusHistory { get; set; } = new List<TicketStatusHistory>();
    public ICollection<TicketCancellationRequest> CancellationRequests { get; set; } = new List<TicketCancellationRequest>();
    public ICollection<TicketProgressEntry> ProgressEntries { get; set; } = new List<TicketProgressEntry>();
}
