using Hrms.Domain.Enums;

namespace Hrms.Application.Features.TicketReports;

public record TicketReportScopeCompanyDto(Guid Id, string Name);
public record TicketReportScopeDepartmentDto(Guid Id, Guid CompanyId, string Name);
public record TicketReportScopeDto(
    IReadOnlyList<TicketReportScopeCompanyDto> Companies,
    IReadOnlyList<TicketReportScopeDepartmentDto> Departments);

public record TicketReportFilter(
    DateOnly? DateFrom,
    DateOnly? DateTo,
    Guid? CompanyId,
    Guid? DepartmentId,
    Guid? CategoryId,
    Guid? TopicId,
    TicketPriority? Priority,
    TicketStatus? Status,
    Guid? ResponsibleEmployeeId,
    TicketRequestType? RequestType,
    TicketProblemType? ProblemType,
    string DateBasis = "CreatedAt");

public record TicketReportMetaDto(
    DateOnly DateFrom,
    DateOnly DateTo,
    string DateBasis,
    string Timezone,
    DateOnly DataCompleteFrom,
    string AppliedScope);

public record TicketDurationMetricDto(double? AverageMinutes, double? MedianMinutes, int SampleCount);

public record TicketReportSummaryDto(
    int OpenCount,
    int UnassignedCount,
    int ActiveCount,
    int WaitingReviewCount,
    int ClosedCount,
    int ReturnedCount,
    int BacklogCount,
    TicketDurationMetricDto TimeToAccept,
    TicketDurationMetricDto TimeToAssign,
    TicketDurationMetricDto TimeToStart,
    TicketDurationMetricDto ActiveWorkTime,
    TicketDurationMetricDto WaitingInfoTime,
    TicketDurationMetricDto ReviewTime,
    TicketDurationMetricDto TotalLeadTime,
    TicketReportMetaDto Meta);

public record TicketTrendItemDto(DateOnly Date, int OpenedCount, int ClosedCount);

public record TicketBacklogItemDto(
    Guid Id, string TicketNo, string Title, TicketStatus Status, TicketPriority Priority,
    string DepartmentName, string CategoryName, string TopicName, string? AssigneeName,
    DateTime CreatedAt, int AgeDays);

public record TicketBacklogResultDto(
    IReadOnlyList<TicketBacklogItemDto> Items, int TotalCount, int Page, int PageSize,
    IReadOnlyDictionary<string, int> AgingBuckets, TicketReportMetaDto Meta);

public record TicketCategoryReportItemDto(
    Guid CategoryId, string CategoryName, Guid TopicId, string TopicName,
    int TotalCount, int ClosedCount, int BacklogCount, double ReturnRatePercent);

public record TicketWorkloadItemDto(
    Guid EmployeeId, string EmployeeName, int AssignedCount, int InProgressCount,
    int WaitingInfoCount, int WaitingReviewCount, int ClosedCount);

public record TicketQualityReportDto(
    int ReviewedTicketCount, int ReturnedReviewCount, int ApprovedReviewCount,
    int TicketsReturnedAtLeastOnce, double ReturnRatePercent, double AverageReviewRounds,
    IReadOnlyDictionary<int, int> ReviewRoundDistribution,
    TicketReportMetaDto Meta);

public record TicketRoutingReportDto(
    int EvaluatedCount,
    int NoMatchCount,
    int SupervisorQueueCount,
    int AutoAssignedCount,
    double AutoAssignmentRatePercent,
    double MatchRatePercent,
    TicketReportMetaDto Meta);

public record TicketReportExportResult(byte[] Content, string FileName, string ContentType, int RowCount);
