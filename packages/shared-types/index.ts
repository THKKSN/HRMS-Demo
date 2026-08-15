// ─── Auth ────────────────────────────────────────────────────────────────────

export type AuthResultDto = {
  accessToken: string
  refreshToken: string
  expiresIn: number
  employee: EmployeeSummaryDto
}

// ─── Employee ────────────────────────────────────────────────────────────────

export type RoleClaim = {
  roleId: string
  role: string
  companyId?: string
  departmentId?: string
}

export type EmployeeSummaryDto = {
  id: string
  employeeCode: string
  national_id: string
  phone: string
  fullName: string
  email?: string
  avatarUrl?: string
  companyId: string
  roles: RoleClaim[]
  permissionCodes?: string[]
}

export type EmployeeProfileDto = EmployeeSummaryDto & {
  phone?: string
  companyName?: string
  departmentId?: string
  departmentName?: string
  roleLabelName?: string
  hireDate?: string
}

export type EmployeeListItemDto = {
  id: string
  employeeCode: string
  fullName: string
  companyId: string
  departmentId?: string
  isActive: boolean
}

// ─── Leave ───────────────────────────────────────────────────────────────────

export type HalfDayType = 'Full' | 'Morning' | 'Afternoon'

export type LeaveStatus =
  | 'Draft'
  | 'PendingSupervisor'
  | 'PendingHr'
  | 'Approved'
  | 'Rejected'
  | 'Cancelled'
  | 'CancellationRequested'

export type LeaveTypeDto = {
  id: string
  code: string
  nameTh: string
  nameEn?: string
  defaultDaysPerYear: number
  requiresAttachment: boolean
}

export type LeaveRequestDto = {
  id: string
  employeeId: string
  employeeName: string
  leaveTypeName: string
  dateFrom: string
  dateTo: string
  halfDay: HalfDayType
  timeFrom?: string
  timeTo?: string
  totalDays: number
  reason?: string
  attachmentUrls: string[]
  status: LeaveStatus
  supervisorName?: string
  supervisorComment?: string
  hrName?: string
  hrComment?: string
  createdAt: string
}

export type LeaveRequestListItemDto = {
  id: string
  leaveTypeName: string
  dateFrom: string
  dateTo: string
  totalDays: number
  status: LeaveStatus
  createdAt: string
  employeeName?: string
}

export type PendingLeaveItemDto = {
  id: string
  employeeName: string
  leaveTypeName: string
  dateFrom: string
  dateTo: string
  totalDays: number
  status: LeaveStatus
  createdAt: string
}

export type LeaveBalanceDto = {
  leaveTypeId: string
  leaveTypeName: string
  year: number
  totalDays: number
  usedDays: number
  pendingDays: number
  remainingDays: number
}

// ─── Company ─────────────────────────────────────────────────────────────────

export type OrgType = 'Holding' | 'Subsidiary' | 'Branch'

export type CompanyDto = {
  id: string
  name: string
  nameEn?: string
  orgType: OrgType
  parentId?: string
  parentName?: string
  isActive: boolean
  isHeadquarters: boolean
}

export type CompanyTreeDto = {
  id: string
  name: string
  nameEn?: string
  orgType: OrgType
  isActive: boolean
  isHeadquarters: boolean
  children: CompanyTreeDto[]
}

// ─── Department ──────────────────────────────────────────────────────────────

export type DepartmentDto = {
  id: string
  companyId: string
  name: string
  deptType?: string
  managerEmployeeId?: string
  managerName?: string
  shiftId?: string
  shiftName?: string
  isActive: boolean
}

export type DepartmentListItemDto = DepartmentDto & {
  employeeCount: number
}

// ─── Tickets ────────────────────────────────────────────────────────────────

export type TicketRequestType = 'Internal' | 'External'
export type TicketRequesterType = TicketRequestType
export type TicketRequesterDto = {
  type: TicketRequesterType
  employeeId?: string
  externalReporterId?: string
  name: string
  phone?: string
  email?: string
  organization?: string
}
export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Critical'
export type TicketProblemType = 'SystemDefect' | 'Enhancement' | 'Other'
export type TicketCommentType = 'General' | 'RequestInfo' | 'Response' | 'Progress'
export type TicketAttachmentVisibility = 'Public' | 'Internal'
export type TicketReviewDecision = 'Approved' | 'Returned'
export type TicketRoutingMode = 'SupervisorAssign' | 'AutoAssignSingle'
export type TicketRoutingLevel = 'None' | 'Topic' | 'Category'
export type TicketRoutingOutcome = 'NotEvaluated' | 'NoMatch' | 'SupervisorQueue' | 'AutoAssigned'
export type TicketAssignmentSource = 'Manual' | 'AutoTopic' | 'AutoCategory' | 'SelfClaim'
export type TicketCancellationStatus = 'Pending' | 'Approved' | 'Rejected'
export type TicketStatus =
  | 'Open'
  | 'Assigned'
  | 'InProgress'
  | 'WaitingInfo'
  | 'Resolved'
  | 'AwaitingRequesterConfirmation'
  | 'Closed'
  | 'Rejected'
  | 'Cancelled'

export type TicketLookupCompanyDto = {
  id: string
  name: string
}

export type TicketLookupDepartmentDto = {
  id: string
  companyId: string
  name: string
}

export type TicketCategoryDto = {
  id: string
  companyId: string
  departmentId: string
  name: string
  description?: string
  sortOrder: number
  isActive: boolean
  enableResponsibilityFallback: boolean
  routingMode: TicketRoutingMode
}

export type TicketTopicDto = {
  id: string
  companyId: string
  departmentId: string
  categoryId: string
  name: string
  description?: string
  sortOrder: number
  isActive: boolean
  routingMode: TicketRoutingMode
}

export type TicketSubjectDto = {
  id: string
  companyId: string
  departmentId: string
  categoryId: string
  topicId: string
  name: string
  description?: string
  sortOrder: number
  isActive: boolean
}

export type TicketManagementScopeDto = {
  companies: TicketLookupCompanyDto[]
  departments: TicketLookupDepartmentDto[]
}

export type TicketAttachmentDto = {
  id: string
  ticketProgressEntryId?: string
  url: string
  fileName?: string
  contentType?: string
  sizeBytes: number
  stage: string
  visibility: TicketAttachmentVisibility
}

export type TicketDto = {
  id: string
  ticketNo: string
  requestType: TicketRequestType
  requesterEmployeeId?: string
  requesterName: string
  requester: TicketRequesterDto
  sourceCompanyId?: string
  sourceDepartmentId?: string
  targetCompanyId: string
  targetCompanyName: string
  targetDepartmentId: string
  targetDepartmentName: string
  categoryId: string
  categoryName: string
  topicId: string
  topicName: string
  subjectId?: string
  subjectName?: string
  otherTopicText?: string
  title: string
  detail: string
  priority: TicketPriority
  status: TicketStatus
  workflowDefinitionId?: string
  workflowName?: string
  workflowAutoAcknowledgeAfterDays?: number
  workflowSteps: TicketWorkflowStepDto[]
  workflowCurrentStepIndexByStatus: Partial<Record<TicketStatus, number>>
  subjectGuidanceConfigId?: string
  subjectGuidanceConfigName?: string
  vehicleText?: string
  locationText?: string
  contactPhone?: string
  contactNote?: string
  attachments: TicketAttachmentDto[]
  createdAt: string
  routingResult: TicketRoutingSummaryDto
}

export type TicketRoutingSummaryDto = {
  mode: TicketRoutingMode
  level: TicketRoutingLevel
  outcome: TicketRoutingOutcome
  assigneeId?: string
  assigneeName?: string
}

export type TicketAssignmentDto = {
  id: string
  ticketId: string
  assignedToEmployeeId: string
  assignedToEmployeeName: string
  assignedByEmployeeId?: string
  assignedByEmployeeName?: string
  assignedAt: string
  isPrimary: boolean
  isActive: boolean
  endedAt?: string
  endedByEmployeeId?: string
  endedByEmployeeName?: string
  note?: string
  assignmentSource: TicketAssignmentSource
  responsibilityId?: string
  routingLevelSnapshot: TicketRoutingLevel
}

export type TicketInboxItemDto = {
  id: string
  ticketNo: string
  title: string
  status: TicketStatus
  priority: TicketPriority
  requesterEmployeeId?: string
  requesterName: string
  requester: TicketRequesterDto
  sourceDepartmentName?: string
  targetCompanyId: string
  targetCompanyName: string
  targetDepartmentId: string
  targetDepartmentName: string
  categoryId: string
  categoryName: string
  topicId: string
  topicName: string
  otherTopicText?: string
  locationText?: string
  vehicleText?: string
  isAccepted: boolean
  supervisorAcceptedAt?: string
  currentAssigneeEmployeeId?: string
  currentAssigneeName?: string
  assignedByEmployeeName?: string
  assignedAt?: string
  workflowCurrentStepKey?: string
  workflowCurrentStepLabel?: string
  currentWorkState?: string
  currentBlockerReason?: string
  currentNextAction?: string
  createdAt: string
}

export type MyTicketItemDto = {
  id: string
  ticketNo: string
  title: string
  status: TicketStatus
  priority: TicketPriority
  requester: TicketRequesterDto
  targetCompanyName: string
  targetDepartmentName: string
  categoryName: string
  topicName: string
  otherTopicText?: string
  currentAssigneeName?: string
  hasPendingCancellation: boolean
  createdAt: string
  updatedAt: string
}

export type TicketCancellationRequestDto = {
  id: string
  ticketId: string
  ticketNo: string
  ticketTitle: string
  requestedByEmployeeId: string
  requestedByEmployeeName: string
  reason: string
  status: TicketCancellationStatus
  requestedAt: string
  reviewedByEmployeeId?: string
  reviewedByEmployeeName?: string
  reviewedAt?: string
  reviewNote?: string
  targetCompanyId: string
  targetCompanyName: string
  targetDepartmentId: string
  targetDepartmentName: string
  ticketStatus: TicketStatus
  ticketUpdatedAt: string
}

export type TicketAssignmentCandidateDto = {
  employeeId: string
  employeeCode: string
  employeeName: string
  roleLabelName?: string
  activeTicketCount: number
  isRecommended: boolean
  responsibilityLevel: TicketRoutingLevel
}

export type EmployeeResponsibilityDto = {
  id: string
  companyId: string
  departmentId: string
  categoryId: string
  categoryName: string
  topicId?: string
  topicName?: string
  employeeId: string
  employeeCode: string
  employeeName: string
  employeeIsEligible: boolean
  isActive: boolean
  effectiveFrom?: string
  effectiveTo?: string
  note?: string
  updatedAt: string
}

export type ResponsibilityEmployeeDto = {
  id: string
  employeeCode: string
  employeeName: string
  roleLabelName?: string
  isActive: boolean
}

export type TicketRoutingPreviewDto = {
  level: TicketRoutingLevel
  mode: TicketRoutingMode
  outcome: TicketRoutingOutcome
  candidates: Array<{ responsibilityId: string; employeeId: string; employeeName: string; lineUserId?: string }>
}

export type TicketRoutingCoverageDto = {
  totalTopics: number
  coveredTopics: number
  uncoveredTopics: number
  autoAssignTopics: number
  autoAssignWithMultipleCandidates: number
  categoryFallbacks: number
}

export type TicketAuditEventDto = {
  id: string
  action: string
  description: string
  oldValues?: string
  newValues?: string
  performedByEmployeeId?: string
  performedByName?: string
  createdAt: string
}

export type TicketDetailDto = {
  id: string
  ticketNo: string
  requestType: TicketRequestType
  status: TicketStatus
  priority: TicketPriority
  requesterEmployeeId?: string
  requesterName: string
  requester: TicketRequesterDto
  sourceCompanyId?: string
  sourceCompanyName?: string
  sourceDepartmentId?: string
  sourceDepartmentName?: string
  targetCompanyId: string
  targetCompanyName: string
  targetDepartmentId: string
  targetDepartmentName: string
  categoryId: string
  categoryName: string
  topicId: string
  topicName: string
  subjectId?: string
  subjectName?: string
  otherTopicText?: string
  title: string
  detail: string
  workflowDefinitionId?: string
  workflowName?: string
  workflowAutoAcknowledgeAfterDays?: number
  workflowBoardSteps: TicketWorkflowStepDto[]
  workflowInProgressPresets: TicketWorkflowInProgressPresetDto[]
  workflowActions: TicketWorkflowActionDto[]
  workflowSteps: TicketWorkflowStepDto[]
  workflowCurrentStepIndexByStatus: Partial<Record<TicketStatus, number>>
  workflowCurrentStepKey?: string
  currentWorkState?: string
  currentBlockerReason?: string
  currentNextAction?: string
  subjectGuidanceConfigId?: string
  subjectGuidanceConfigName?: string
  vehicleText?: string
  locationText?: string
  contactPhone?: string
  contactNote?: string
  receiverEmployeeId?: string
  receiverEmployeeName?: string
  supervisorAcceptedByEmployeeId?: string
  supervisorAcceptedByEmployeeName?: string
  supervisorAcceptedAt?: string
  workStartedByEmployeeId?: string
  workStartedByEmployeeName?: string
  workStartedAt?: string
  waitingInfoByEmployeeId?: string
  waitingInfoByEmployeeName?: string
  waitingInfoAt?: string
  problemType?: TicketProblemType
  initialInspectionNote?: string
  resolutionNote?: string
  resolvedByEmployeeId?: string
  resolvedByEmployeeName?: string
  resolvedAt?: string
  verifiedByEmployeeId?: string
  verifiedByEmployeeName?: string
  verifiedAt?: string
  closedByEmployeeId?: string
  closedByEmployeeName?: string
  closedAt?: string
  rejectedByEmployeeId?: string
  rejectedByEmployeeName?: string
  rejectedAt?: string
  rejectionReason?: string
  cancelledByEmployeeId?: string
  cancelledByEmployeeName?: string
  cancelledAt?: string
  cancellationReason?: string
  currentAssignment?: TicketAssignmentDto
  progressEntries: TicketProgressEntryDto[]
  attachments: TicketAttachmentDto[]
  latestCancellationRequest?: TicketCancellationRequestDto
  auditEvents: TicketAuditEventDto[]
  actions: TicketActionFlagsDto
  createdAt: string
  updatedAt: string
}

export type TicketProgressEntryDto = {
  id: string
  workflowStepKey: string
  workState?: string
  blockerReason?: string
  nextAction?: string
  isCompleted: boolean
  note?: string
  ownerEmployeeId?: string
  ownerEmployeeName?: string
  dueAt?: string
  createdByEmployeeId: string
  createdByEmployeeName: string
  createdAt: string
  attachments: TicketAttachmentDto[]
}

export type TicketActionFlagsDto = {
  isRequester: boolean
  isReceiverSide: boolean
  canAccept: boolean
  canTriage: boolean
  canAssign: boolean
  canReject: boolean
  canStart: boolean
  canEditWorkDetail: boolean
  canRequestInfo: boolean
  canResume: boolean
  canResolve: boolean
  canComment: boolean
  canAddInternalNote: boolean
  canAddAttachment: boolean
  canAddWorkAttachment: boolean
  canReturnForRevision: boolean
  canClose: boolean
  canViewTicketReport: boolean
  canClaim: boolean
  canRequestCancellation: boolean
}

export type TicketReviewDto = {
  id: string
  ticketId: string
  reviewRound: number
  decision: TicketReviewDecision
  reviewNote?: string
  reviewedByEmployeeId: string
  reviewedByEmployeeName: string
  reviewedAt: string
  resolvedByEmployeeId?: string
  resolvedByEmployeeName?: string
  resolvedAt?: string
  problemTypeSnapshot?: TicketProblemType
  initialInspectionSnapshot?: string
  resolutionSnapshot?: string
  resolvedAttachmentIds: string[]
}

export type TicketReportScopeDto = {
  companies: Array<{ id: string; name: string }>
  departments: Array<{ id: string; companyId: string; name: string }>
}

export type TicketReportMetaDto = {
  dateFrom: string
  dateTo: string
  dateBasis: string
  timezone: string
  dataCompleteFrom: string
  appliedScope: string
}

export type TicketDurationMetricDto = {
  averageMinutes?: number
  medianMinutes?: number
  sampleCount: number
}

export type TicketReportSummaryDto = {
  openCount: number
  unassignedCount: number
  activeCount: number
  waitingReviewCount: number
  closedCount: number
  returnedCount: number
  backlogCount: number
  timeToAccept: TicketDurationMetricDto
  timeToAssign: TicketDurationMetricDto
  timeToStart: TicketDurationMetricDto
  activeWorkTime: TicketDurationMetricDto
  waitingInfoTime: TicketDurationMetricDto
  reviewTime: TicketDurationMetricDto
  totalLeadTime: TicketDurationMetricDto
  meta: TicketReportMetaDto
}

export type TicketTrendItemDto = { date: string; openedCount: number; closedCount: number }

export type TicketBacklogItemDto = {
  id: string
  ticketNo: string
  title: string
  status: TicketStatus
  priority: TicketPriority
  departmentName: string
  categoryName: string
  topicName: string
  assigneeName?: string
  createdAt: string
  ageDays: number
}

export type TicketBacklogResultDto = {
  items: TicketBacklogItemDto[]
  totalCount: number
  page: number
  pageSize: number
  agingBuckets: Record<string, number>
  meta: TicketReportMetaDto
}

export type TicketCategoryReportItemDto = {
  categoryId: string
  categoryName: string
  topicId: string
  topicName: string
  totalCount: number
  closedCount: number
  backlogCount: number
  returnRatePercent: number
}

export type TicketWorkloadItemDto = {
  employeeId: string
  employeeName: string
  assignedCount: number
  inProgressCount: number
  waitingInfoCount: number
  waitingReviewCount: number
  closedCount: number
}

export type TicketQualityReportDto = {
  reviewedTicketCount: number
  returnedReviewCount: number
  approvedReviewCount: number
  ticketsReturnedAtLeastOnce: number
  returnRatePercent: number
  averageReviewRounds: number
  reviewRoundDistribution: Record<string, number>
  meta: TicketReportMetaDto
}

export type TicketRoutingReportDto = {
  evaluatedCount: number
  noMatchCount: number
  supervisorQueueCount: number
  autoAssignedCount: number
  autoAssignmentRatePercent: number
  matchRatePercent: number
  meta: TicketReportMetaDto
}

export type TicketCommentDto = {
  id: string
  ticketId: string
  employeeId: string
  employeeName: string
  commentType: TicketCommentType
  message: string
  isInternal: boolean
  createdAt: string
}

export type AssignedTicketItemDto = {
  id: string
  ticketNo: string
  title: string
  status: TicketStatus
  priority: TicketPriority
  requesterName: string
  requester: TicketRequesterDto
  categoryName: string
  topicName: string
  vehicleText?: string
  locationText?: string
  assignedAt: string
  workStartedAt?: string
  workflowCurrentStepKey?: string
  workflowCurrentStepLabel?: string
  currentWorkState?: string
  currentBlockerReason?: string
  currentNextAction?: string
  updatedAt: string
}

export type TicketTimelineEventDto = {
  id: string
  eventType: 'Audit' | 'Comment'
  action: string
  description: string
  employeeId?: string
  employeeName?: string
  isInternal: boolean
  createdAt: string
}

export type TicketActionResultDto = {
  ticketId: string
  status: TicketStatus
  updatedAt: string
  progressEntryId?: string
}

// ─── Address Reference ───────────────────────────────────────────────────────

export type ProvinceDto = {
  provinceId: number
  provinceName?: string
}

export type DistrictDto = {
  districtId: number
  districtName?: string
  provinceId?: number
}

export type SubDistrictDto = {
  subDistrictId: number
  subDistrictName?: string
  districtId?: number
  provinceId?: number
}

// ─── Location ────────────────────────────────────────────────────────────────

export type LocationDto = {
  id: string
  companyId: string
  name: string
  latitude: number
  longitude: number
  radiusMeters: number
  address?: string
  provinceId?: number
  provinceName?: string
  districtId?: number
  districtName?: string
  subDistrictId?: number
  subDistrictName?: string
  isActive: boolean
}

// ─── Role Label ──────────────────────────────────────────────────────────────

export type RoleType = 'Employee' | 'Supervisor' | 'Hr' | 'SchoolAdmin' | 'Executive' | 'Admin'

export type RoleLabelDto = {
  id: string
  companyId: string
  name: string
  isActive: boolean
}

// ─── Attendance ──────────────────────────────────────────────────────────────

export type AttendanceStatus = 'Present' | 'Late' | 'Absent' | 'HalfDay'

export type AttendanceTodayDto = {
  id?: string
  date: string
  checkInTime?: string
  checkOutTime?: string
  checkInLatitude?: number
  checkInLongitude?: number
  checkInSelfieUrl?: string
  checkOutSelfieUrl?: string
  locationId?: string
  locationName?: string
  isLate: boolean
  lateMinutes: number
  status?: AttendanceStatus
  remark?: string
  canCheckIn: boolean
  canCheckOut: boolean
  shiftName?: string
  shiftStart?: string
  shiftEnd?: string
}

export type AttendanceRecordDto = {
  id: string
  employeeId: string
  employeeFullName: string
  employeeCode: string
  date: string
  checkInTime?: string
  checkOutTime?: string
  checkInLatitude?: number
  checkInLongitude?: number
  checkInSelfieUrl?: string
  checkOutSelfieUrl?: string
  locationId?: string
  locationName?: string
  isLate: boolean
  lateMinutes: number
  status: AttendanceStatus
  remark?: string
}

export type AttendanceRecordHrDto = {
  id: string
  employeeId: string
  employeeFullName: string
  employeeCode: string
  companyName?: string
  departmentName?: string
  date: string
  checkInTime?: string
  checkOutTime?: string
  checkInLatitude?: number
  checkInLongitude?: number
  checkInSelfieUrl?: string
  checkOutSelfieUrl?: string
  locationId?: string
  locationName?: string
  isLate: boolean
  lateMinutes: number
  workDurationMinutes?: number
  status: AttendanceStatus
  remark?: string
  createdAt: string
  updatedAt: string
}

// ─── Employee Attendance History ─────────────────────────────────────────────

export type EmployeeCalendarDayDto = {
  date: string              // "YYYY-MM-DD"
  isWorkingDay: boolean
  isHoliday: boolean
  holidayName: string | null
  status: AttendanceStatus | null
  checkInTime: string | null
  checkOutTime: string | null
  workDurationMinutes: number | null
  isLate: boolean
  lateMinutes: number
  isOnLeave: boolean
  leaveTypeName: string | null
  remark: string | null
}

export type EmployeeMonthlyStatsDto = {
  employeeId: string
  employeeFullName: string
  employeeCode: string
  companyName: string | null
  departmentName: string | null
  year: number
  month: number
  workingDays: number
  presentDays: number
  lateDays: number
  halfDays: number
  absentDays: number
  leaveDays: number
  notRecordedDays: number
  totalLateMinutes: number
  attendanceRate: number
  avgWorkDurationMinutes: number | null
}

// ─── Audit Log ───────────────────────────────────────────────────────────────

export type AuditLogDto = {
  id: string
  module: string
  entityType: string
  entityId: string
  action: string
  description: string
  oldValues?: string
  newValues?: string
  performedByEmployeeId?: string
  performedByName?: string
  performedAt: string
}

// ─── Holiday ─────────────────────────────────────────────────────────────────

export type HolidayDto = {
  id: string
  companyId?: string
  companyName?: string
  name: string
  date: string      // "YYYY-MM-DD"
  isActive: boolean
}

// ─── Attendance Policy ───────────────────────────────────────────────────────

export type AttendancePolicyDto = {
  id: string
  companyId: string
  companyName: string
  maxLateMinutesPerMonth: number
  maxLateCountPerMonth: number
  maxAbsenceCountPerMonth: number
  isActive: boolean
}

export type AttendanceMonthlyViolationDto = {
  employeeId: string
  employeeName: string
  year: number
  month: number
  totalLateCount: number
  totalLateMinutes: number
  totalAbsenceCount: number
  isLateCountViolated: boolean
  isLateMinutesViolated: boolean
  isAbsenceViolated: boolean
  isViolated: boolean
}

// ─── Permissions ─────────────────────────────────────────────────────────────

export type PermissionDto = {
  id: string
  code: string
  module: string
  action: string
  description: string
  isSystem: boolean
}

export type RolePermissionSummaryDto = {
  roleId: string
  role: string
  roleName: string
  permissionCodes: string[]
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export type AbsentLateItemDto = {
  employeeId: string
  employeeFullName: string
  departmentName?: string
  lateMinutes?: number
}

export type AttendanceDailySummaryDto = {
  date: string
  totalEmployees: number
  present: number
  late: number
  halfDay: number
  absent: number
  onLeave: number
  notRecorded: number
  attendanceRate: number
  topAbsent: AbsentLateItemDto[]
  topLate: AbsentLateItemDto[]
}

export type AttendanceTrendItemDto = {
  date: string
  present: number
  late: number
  halfDay: number
  absent: number
  onLeave: number
  total: number
  rate: number
}

export type AttendanceMonthlySummaryDto = {
  employeeId: string
  employeeCode: string
  employeeFullName: string
  departmentName?: string
  workingDays: number
  presentDays: number
  lateDays: number
  halfDays: number
  absentDays: number
  leaveDays: number
  totalLateMinutes: number
  attendanceRate: number
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export type MyDashboardDto = {
  todayAttendance: {
    id?: string
    date: string
    checkInTime?: string
    checkOutTime?: string
    status?: AttendanceStatus
    isLate: boolean
    lateMinutes: number
  } | null
  leaveBalance: {
    leaveTypeName: string
    remainingDays: number
    totalDays: number
    pendingDays: number
  }[]
  pendingLeaveCount: number
  monthStats: {
    presentDays: number
    lateDays: number
    absentDays: number
    leaveDays: number
    workingDays: number
  }
}

export type TeamDashboardDto = {
  teamSize: number
  pendingApprovalCount: number
  todayStats: { present: number; late: number; absent: number; onLeave: number; notRecorded: number }
  todayAbsent: { employeeId: string; employeeName: string }[]
  todayLate: { employeeId: string; employeeName: string; lateMinutes: number }[]
  onLeaveToday: { employeeId: string; employeeName: string; leaveTypeName: string }[]
  pendingApprovals: {
    id: string
    employeeName: string
    leaveTypeName: string
    dateFrom: string
    dateTo: string
    totalDays: number
  }[]
}

export type CompanyDashboardDto = {
  totalEmployees: number
  todayStats: {
    present: number
    late: number
    absent: number
    onLeave: number
    notRecorded: number
    attendanceRate: number
  }
  pendingLeaveApprovals: number
  topAbsentDepartments: { departmentName: string; absentCount: number }[]
  monthlyTrend: { date: string; present: number; late: number; absent: number; onLeave: number }[]
  isSystemWide: boolean
  selectedCompanyId: string | null
  selectedCompanyName: string | null
}

export type AccessibleCompanyItem = {
  id: string
  name: string
  parentId: string | null
  isHeadquarters: boolean
  level: number
}

export type AdminDashboardDto = {
  totalCompanies: number
  totalDepartments: number
  totalEmployees: number
  activeEmployees: number
  recentAuditLogs: {
    id: string
    module: string
    action: string
    description: string
    performedByName?: string
    performedAt: string
  }[]
}

// ─── OT Requests ─────────────────────────────────────────────────────────────

export type OtStatus = 'PendingSupervisor' | 'PendingHr' | 'Approved' | 'Rejected' | 'Cancelled'
export type OtRateType = 'Weekday' | 'Weekend' | 'Holiday'

export type OtRequestDto = {
  id: string
  employeeId: string
  employeeName: string
  departmentName?: string
  date: string
  startTime: string
  endTime: string
  totalHours: number
  rateType: OtRateType
  reason?: string
  status: OtStatus
  supervisorName?: string
  supervisorComment?: string
  supervisorApprovedAt?: string
  hrName?: string
  hrComment?: string
  hrAcknowledgedAt?: string
  createdAt: string
}

// ─── Expenses ────────────────────────────────────────────────────────────────

export type ExpenseClaimType = 'Fuel' | 'Toll' | 'Parking' | 'Meal' | 'Other'

export type ExpenseClaimStatus = 'Draft' | 'Pending' | 'Approved' | 'Rejected' | 'Cancelled' | 'Batched' | 'Paid'
export type ExpenseBillingBatchStatus = 'Draft' | 'Exported' | 'Paid' | 'Cancelled'
export type ExpenseAttachmentDocumentType = 'PaymentOrder' | 'Receipt' | 'Other'
export type ExpenseOcrStatus = 'Pending' | 'Processing' | 'Succeeded' | 'Failed'

export type ExpenseAttachmentFileDto = {
  url: string
  documentType: ExpenseAttachmentDocumentType
  fileName?: string
  contentType?: string
  sizeBytes?: number
}

export type ExpenseClaimDto = {
  id: string
  employeeId: string
  employeeName: string
  type: ExpenseClaimType
  status: ExpenseClaimStatus
  expenseDate: string
  amount: number
  merchantName?: string
  billNo?: string
  receiptTid?: string
  receiptBatch?: string
  receiptMid?: string
  receiptTrace?: string
  driverName?: string
  vehicleNo?: string
  plateNo?: string
  fuelLiters?: number
  transportNo?: string
  origin?: string
  customerName?: string
  tripCount?: number
  note?: string
  attachmentUrls: string[]
  attachmentFiles: ExpenseAttachmentFileDto[]
  createdAt: string
}

export type ExpenseOcrFieldSuggestionDto = {
  value?: string
  confidence?: number
  source?: string
  documentType?: ExpenseAttachmentDocumentType
  attachmentUrl?: string
}

export type ExpenseOcrResultDto = {
  id: string
  attachmentUrl: string
  documentType: ExpenseAttachmentDocumentType
  provider: string
  status: ExpenseOcrStatus
  rawText?: string
  rawLinesJson?: string
  parsedFields: Record<string, ExpenseOcrFieldSuggestionDto>
  confidenceScore?: number
  durationMs?: number
  profile?: string
  maxSide?: number
  preprocessVariant?: string
  attemptCount: number
  workerVersion?: string
  modelVersion?: string
  errorMessage?: string
  processingStartedAt?: string
  processedAt?: string
  createdAt: string
}

export type ExpenseOcrStartDto = {
  expenseClaimId: string
  results: ExpenseOcrResultDto[]
}

export type ExpenseOcrSummaryDto = {
  expenseClaimId: string
  status: ExpenseOcrStatus
  results: ExpenseOcrResultDto[]
  suggestions: Record<string, ExpenseOcrFieldSuggestionDto>
  canApply: boolean
}

export type ApplyExpenseOcrRequest = {
  expenseDate?: string
  amount?: number
  merchantName?: string
  billNo?: string
  receiptTid?: string
  receiptBatch?: string
  receiptMid?: string
  receiptTrace?: string
  driverName?: string
  vehicleNo?: string
  plateNo?: string
  fuelLiters?: number
  transportNo?: string
  origin?: string
  customerName?: string
  tripCount?: number
}

export type ExpenseBillingBatchListItemDto = {
  id: string
  batchNo: string
  periodFrom: string
  periodTo: string
  status: ExpenseBillingBatchStatus
  totalClaims: number
  totalAmount: number
  note?: string
  createdByEmployeeId: string
  createdByEmployeeName: string
  exportedAt?: string
  paidAt?: string
  createdAt: string
}

export type ExpenseBillingBatchItemDto = {
  id: string
  expenseClaimId: string
  employeeName: string
  type: ExpenseClaimType
  status: ExpenseClaimStatus
  expenseDate: string
  amount: number
  amountSnapshot: number
  merchantName?: string
  billNo?: string
  receiptTid?: string
  receiptBatch?: string
  receiptMid?: string
  receiptTrace?: string
  vehicleNo?: string
  plateNo?: string
}

export type ExpenseBillingBatchDto = ExpenseBillingBatchListItemDto & {
  items: ExpenseBillingBatchItemDto[]
}

// ─── Common ──────────────────────────────────────────────────────────────────

export type PagedResult<T> = {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
}

export type ApiError = {
  traceId: string
  error: string
  message: string
  details?: unknown
}

export type TicketSubjectGuidanceRule = {
  categoryNames?: string[]
  topicNames?: string[]
  subjectNames?: string[]
  suggestions?: string[]
  template?: string
}

export type TicketSubjectGuidance = {
  suggestions: string[]
  template: string
}

export const TICKET_SUBJECT_GUIDANCE_RULES: TicketSubjectGuidanceRule[] = [
  {
    categoryNames: ['Software'],
    topicNames: ['SMMS'],
    subjectNames: ['ปลดล็อคเอกสาร', 'ปลดล็อกเอกสาร'],
    suggestions: [
      'ใบแจ้งซ่อม',
      'ใบส่งซ่อม',
      'การส่งซ่อม',
      'ใบแจ้งงาน',
      'รายการซ่อมบำรุง',
      'ใบปะหน้าค่าใช้จ่าย',
    ],
    template: ['ชื่อเอกสาร:', 'เลขที่เอกสาร:', 'ปัญหา:'].join('\n'),
  },
]

type TicketSubjectGuidanceInput = {
  categoryName?: string
  topicName?: string
  subjectName?: string
}

function normalizeTicketGuidanceValue(value?: string) {
  return value?.trim() ?? ''
}

function matchesTicketGuidanceRule(values: string[], expected?: string[]) {
  if (!expected || expected.length === 0) return true
  return expected.some(item => values.includes(normalizeTicketGuidanceValue(item)))
}

export function getTicketSubjectGuidance({
  categoryName,
  topicName,
  subjectName,
}: TicketSubjectGuidanceInput): TicketSubjectGuidance | null {
  const category = normalizeTicketGuidanceValue(categoryName)
  const topic = normalizeTicketGuidanceValue(topicName)
  const subject = normalizeTicketGuidanceValue(subjectName)

  for (const rule of TICKET_SUBJECT_GUIDANCE_RULES) {
    if (
      matchesTicketGuidanceRule([category], rule.categoryNames)
      && matchesTicketGuidanceRule([topic], rule.topicNames)
      && matchesTicketGuidanceRule([subject], rule.subjectNames)
      && rule.template
    ) {
      return {
        suggestions: rule.suggestions ?? [],
        template: rule.template,
      }
    }
  }

  return null
}

export function applyTicketDetailTemplate(currentDetail: string, guidance: TicketSubjectGuidance) {
  return currentDetail.trim().length > 0 ? currentDetail : guidance.template
}

export function applyTicketDetailSuggestion(currentDetail: string, suggestion: string, guidance: TicketSubjectGuidance) {
  const baseDetail = currentDetail.trim().length > 0 ? currentDetail : guidance.template
  const lines = baseDetail.split(/\r?\n/)
  const documentLineIndex = lines.findIndex(line => line.trim().startsWith('ชื่อเอกสาร:'))

  if (documentLineIndex >= 0) {
    lines[documentLineIndex] = `ชื่อเอกสาร: ${suggestion}`
    return lines.join('\n')
  }

  return [`ชื่อเอกสาร: ${suggestion}`, ...lines].join('\n')
}
export type TicketGuidanceSuggestion = {
  label: string
  value: string
}

export type TicketSubjectGuidanceRuleV2 = {
  key: string
  categoryNames?: string[]
  topicNames?: string[]
  subjectNames?: string[]
  suggestions?: TicketGuidanceSuggestion[]
  template?: string
  suggestionTargetLabel?: string
  workflowKey?: string
}

export type ResolvedTicketSubjectGuidance = {
  suggestions: TicketGuidanceSuggestion[]
  template: string
  suggestionTargetLabel?: string
  workflowKey: string
}

export type TicketWorkflowStepDisplay = {
  key: string
  label: string
}

export type TicketBoardActorType = 'requester' | 'supervisor' | 'assignee' | 'system'

export type TicketBoardStepKind = 'start' | 'queue' | 'working' | 'review' | 'acceptance' | 'end'

export type TicketBoardStepState = 'complete' | 'current' | 'upcoming'

export type TicketBoardStep = {
  key: string
  label: string
  actorType: TicketBoardActorType
  kind: TicketBoardStepKind
}

export type TicketBoardWorkflowDefinition = {
  key: string
  name: string
  autoAcknowledgeAfterDays?: number
  steps: TicketBoardStep[]
  currentStepKeyByStatus: Partial<Record<TicketStatus, string>>
}

export type TicketWorkflowDisplayConfig = {
  key: string
  name: string
  autoAcknowledgeAfterDays?: number
  steps: TicketWorkflowStepDisplay[]
  currentStepIndexByStatus: Partial<Record<TicketStatus, number>>
}

export type TicketWorkflowStepDto = {
  key: string
  label: string
  sortOrder: number
  actorType?: string
  kind?: string
}

export type TicketWorkflowInProgressPresetDto = {
  key: string
  label: string
  kind: string
  sortOrder: number
  isActive: boolean
}

export type TicketWorkflowActionDto = {
  stepKey: string
  actionKey: string
  actionLabel: string
  actorType: string
  sortOrder: number
}

export type TicketWorkflowDefinitionDto = {
  id: string
  companyId: string
  departmentId: string
  code: string
  name: string
  description?: string
  sortOrder: number
  autoAcknowledgeAfterDays?: number
  isActive: boolean
  boardSteps: TicketWorkflowStepDto[]
  inProgressPresets: TicketWorkflowInProgressPresetDto[]
  actions: TicketWorkflowActionDto[]
  steps: TicketWorkflowStepDto[]
  currentStepIndexByStatus: Partial<Record<TicketStatus, number>>
}

export type TicketSubjectGuidanceConfigDto = {
  id: string
  companyId: string
  departmentId: string
  categoryId?: string
  topicId?: string
  subjectId?: string
  workflowDefinitionId?: string
  workflowName?: string
  name: string
  suggestionTargetLabel?: string
  suggestions: TicketGuidanceSuggestion[]
  template: string
  priority: number
  isActive: boolean
}

export type TicketResolvedSubjectGuidanceDto = {
  guidanceConfigId?: string
  guidanceConfigName?: string
  suggestionTargetLabel?: string
  suggestions: TicketGuidanceSuggestion[]
  template?: string
  workflowDefinitionId?: string
  workflowName?: string
  workflowAutoAcknowledgeAfterDays?: number
  workflowSteps: TicketWorkflowStepDto[]
  workflowCurrentStepIndexByStatus: Partial<Record<TicketStatus, number>>
}

export const DEFAULT_TICKET_BOARD_WORKFLOW: TicketBoardWorkflowDefinition = {
  key: 'default',
  name: 'Standard Service Board',
  autoAcknowledgeAfterDays: 7,
  steps: [
    { key: 'submitted', label: 'แจ้งเรื่อง', actorType: 'requester', kind: 'start' },
    { key: 'received', label: 'รับเรื่อง', actorType: 'supervisor', kind: 'queue' },
    { key: 'assigned', label: 'จ่ายงาน', actorType: 'supervisor', kind: 'queue' },
    { key: 'in_progress', label: 'กำลังดำเนินการ', actorType: 'assignee', kind: 'working' },
    { key: 'completed_review', label: 'ตรวจสอบงาน', actorType: 'supervisor', kind: 'review' },
    { key: 'accepted', label: 'คนแจ้งเรื่องตรวจรับงาน', actorType: 'requester', kind: 'end' },
    { key: 'closed', label: 'จบงาน', actorType: 'system', kind: 'end' },
  ],
  currentStepKeyByStatus: {
    Open: 'submitted',
    Assigned: 'assigned',
    InProgress: 'in_progress',
    WaitingInfo: 'in_progress',
    Resolved: 'completed_review',
    AwaitingRequesterConfirmation: 'accepted',
    Closed: 'closed',
  },
}

export const TICKET_SUBJECT_GUIDANCE_RULES_V2: TicketSubjectGuidanceRuleV2[] = [
  {
    key: 'software-smms-document-unlock',
    categoryNames: ['Software'],
    topicNames: ['SMMS'],
    subjectNames: ['ปลดล็อคเอกสาร', 'ปลดล็อกเอกสาร'],
    suggestions: [
      { label: 'ใบแจ้งซ่อม', value: 'ใบแจ้งซ่อม' },
      { label: 'ใบส่งซ่อม', value: 'ใบส่งซ่อม' },
      { label: 'การส่งซ่อม', value: 'การส่งซ่อม' },
      { label: 'ใบแจ้งงาน', value: 'ใบแจ้งงาน' },
      { label: 'รายการซ่อมบำรุง', value: 'รายการซ่อมบำรุง' },
      { label: 'ใบปะหน้าค่าใช้จ่าย', value: 'ใบปะหน้าค่าใช้จ่าย' },
    ],
    template: ['ชื่อเอกสาร:', 'เลขที่เอกสาร:', 'ปัญหา:'].join('\n'),
    suggestionTargetLabel: 'ชื่อเอกสาร:',
    workflowKey: 'software-smms-document-unlock',
  },
  {
    key: 'gps-repair-not-updating',
    categoryNames: ['GPS'],
    topicNames: ['แจ้งซ่อม'],
    subjectNames: ['GPS ไม่อัปเดต'],
    suggestions: [
      { label: 'เพิ่มทะเบียนรถ', value: 'ทะเบียนรถ:' },
      { label: 'เพิ่มเบอร์รถ', value: 'เบอร์รถ:' },
      { label: 'เพิ่มสถานที่พบปัญหา', value: 'สถานที่พบปัญหา:' },
      { label: 'เพิ่มอาการ', value: 'อาการ:' },
    ],
    template: ['ทะเบียนรถ:', 'เบอร์รถ:', 'สถานที่พบปัญหา:', 'อาการ:'].join('\n'),
    workflowKey: 'gps-repair',
  },
]

export const TICKET_WORKFLOW_DISPLAYS_V2: TicketWorkflowDisplayConfig[] = [
  {
    key: 'default',
    name: 'Default Ticket Workflow',
    steps: [
      { key: 'submitted', label: 'ส่งเรื่อง' },
      { key: 'accepted', label: 'รับเรื่อง' },
      { key: 'working', label: 'เริ่มทำงาน' },
      { key: 'resolved', label: 'จบงานรอตรวจ' },
      { key: 'closed', label: 'ปิดงาน' },
    ],
    currentStepIndexByStatus: {
      Open: 0,
      Assigned: 1,
      InProgress: 2,
      WaitingInfo: 2,
      Resolved: 3,
      Closed: 4,
    },
  },
  {
    key: 'software-smms-document-unlock',
    name: 'Software / SMMS / ปลดล็อคเอกสาร',
    autoAcknowledgeAfterDays: 7,
    steps: [
      { key: 'submitted', label: 'ส่งเรื่อง' },
      { key: 'accepted', label: 'รับเรื่อง' },
      { key: 'working', label: 'เริ่มทำงาน' },
      { key: 'resolved', label: 'จบงานรอตรวจ' },
      { key: 'verified', label: 'ตรวจจบ' },
      { key: 'acknowledged', label: 'ผู้แจ้งรับทราบ' },
    ],
    currentStepIndexByStatus: {
      Open: 0,
      Assigned: 1,
      InProgress: 2,
      WaitingInfo: 2,
      Resolved: 3,
      Closed: 5,
    },
  },
  {
    key: 'gps-repair',
    name: 'GPS / แจ้งซ่อม / GPS ไม่อัปเดต',
    autoAcknowledgeAfterDays: 7,
    steps: [
      { key: 'submitted', label: 'ส่งเรื่อง' },
      { key: 'accepted', label: 'รับเรื่อง' },
      { key: 'dispatched', label: 'จ่ายงาน' },
      { key: 'working', label: 'เริ่มทำงาน' },
      { key: 'procurement', label: 'จัดซื้ออุปกรณ์' },
      { key: 'resolved', label: 'จบงานรอตรวจ' },
      { key: 'verified', label: 'ตรวจจบ' },
      { key: 'acknowledged', label: 'ผู้แจ้งรับทราบ' },
    ],
    currentStepIndexByStatus: {
      Open: 0,
      Assigned: 2,
      InProgress: 3,
      WaitingInfo: 4,
      Resolved: 5,
      Closed: 7,
    },
  },
]

export const TICKET_BOARD_WORKFLOWS: TicketBoardWorkflowDefinition[] = [
  DEFAULT_TICKET_BOARD_WORKFLOW,
  {
    ...DEFAULT_TICKET_BOARD_WORKFLOW,
    key: 'software-smms-document-unlock',
    name: 'Software / SMMS / ปลดล็อคเอกสาร',
  },
  {
    ...DEFAULT_TICKET_BOARD_WORKFLOW,
    key: 'gps-repair',
    name: 'GPS / แจ้งซ่อม / GPS ไม่อัปเดต',
  },
]

type TicketSubjectGuidanceLookupInputV2 = {
  categoryName?: string
  topicName?: string
  subjectName?: string
}

function normalizeTicketGuidanceValueV2(value?: string) {
  return value?.trim() ?? ''
}

function matchesTicketGuidanceRuleV2(value: string, expected?: string[]) {
  if (!expected || expected.length === 0) return true
  return expected.some(item => normalizeTicketGuidanceValueV2(item) === value)
}

export function resolveTicketSubjectGuidance(input: TicketSubjectGuidanceLookupInputV2): ResolvedTicketSubjectGuidance | null {
  const category = normalizeTicketGuidanceValueV2(input.categoryName)
  const topic = normalizeTicketGuidanceValueV2(input.topicName)
  const subject = normalizeTicketGuidanceValueV2(input.subjectName)

  for (const rule of TICKET_SUBJECT_GUIDANCE_RULES_V2) {
    if (
      matchesTicketGuidanceRuleV2(category, rule.categoryNames)
      && matchesTicketGuidanceRuleV2(topic, rule.topicNames)
      && matchesTicketGuidanceRuleV2(subject, rule.subjectNames)
      && rule.template
      && rule.workflowKey
    ) {
      return {
        suggestions: rule.suggestions ?? [],
        template: rule.template,
        suggestionTargetLabel: rule.suggestionTargetLabel,
        workflowKey: rule.workflowKey,
      }
    }
  }

  return null
}

export function resolveTicketWorkflowDisplay(input: TicketSubjectGuidanceLookupInputV2): TicketWorkflowDisplayConfig {
  const workflowKey = resolveTicketSubjectGuidance(input)?.workflowKey ?? 'default'
  return TICKET_WORKFLOW_DISPLAYS_V2.find(item => item.key === workflowKey) ?? TICKET_WORKFLOW_DISPLAYS_V2[0]
}

export function resolveTicketBoardWorkflow(input: TicketSubjectGuidanceLookupInputV2): TicketBoardWorkflowDefinition {
  const workflowKey = resolveTicketSubjectGuidance(input)?.workflowKey ?? 'default'
  return TICKET_BOARD_WORKFLOWS.find(item => item.key === workflowKey) ?? TICKET_BOARD_WORKFLOWS[0]
}

export function createTicketWorkflowDisplayFromDto(input: {
  workflowName?: string
  workflowAutoAcknowledgeAfterDays?: number
  workflowSteps?: TicketWorkflowStepDto[]
  workflowCurrentStepIndexByStatus?: Partial<Record<TicketStatus, number>>
}) {
  if (!input.workflowSteps || input.workflowSteps.length === 0) return null

  return {
    key: 'ticket-snapshot',
    name: input.workflowName ?? 'Ticket Workflow',
    autoAcknowledgeAfterDays: input.workflowAutoAcknowledgeAfterDays,
    steps: input.workflowSteps.map(step => ({ key: step.key, label: step.label })),
    currentStepIndexByStatus: input.workflowCurrentStepIndexByStatus ?? {},
  } satisfies TicketWorkflowDisplayConfig
}

export function createTicketBoardWorkflowFromDto(input: {
  workflowName?: string
  workflowAutoAcknowledgeAfterDays?: number
  workflowSteps?: TicketWorkflowStepDto[]
  workflowCurrentStepIndexByStatus?: Partial<Record<TicketStatus, number>>
}) {
  if (!input.workflowSteps || input.workflowSteps.length === 0) return null

  const steps: TicketBoardStep[] = input.workflowSteps.map((step, index, allSteps) => ({
    key: step.key,
    label: step.label,
    actorType: index === 0 ? 'requester' : index === 1 || index === allSteps.length - 2 ? 'supervisor' : index === allSteps.length - 1 ? 'requester' : 'assignee',
    kind: index === 0
      ? 'start'
      : index === allSteps.length - 1
        ? 'end'
        : step.key.includes('progress') || step.key.includes('working') || step.key.includes('start')
          ? 'working'
          : step.key.includes('review') || step.key.includes('resolve') || step.key.includes('close')
            ? 'review'
            : 'queue',
  }))

  return {
    key: 'ticket-snapshot',
    name: input.workflowName ?? 'Ticket Workflow',
    autoAcknowledgeAfterDays: input.workflowAutoAcknowledgeAfterDays,
    steps,
    currentStepKeyByStatus: Object.entries(input.workflowCurrentStepIndexByStatus ?? {}).reduce((result, [status, stepIndex]) => {
      if (typeof stepIndex === 'number' && steps[stepIndex]) {
        result[status as TicketStatus] = steps[stepIndex].key
      }
      return result
    }, {} as Partial<Record<TicketStatus, string>>),
  } satisfies TicketBoardWorkflowDefinition
}

export function getTicketWorkflowStepStateV2(
  workflow: TicketWorkflowDisplayConfig,
  status: TicketStatus,
  stepIndex: number,
): 'complete' | 'current' | 'upcoming' {
  const currentStepIndex = workflow.currentStepIndexByStatus[status]
  if (currentStepIndex === undefined) return stepIndex === 0 ? 'current' : 'upcoming'
  if (stepIndex < currentStepIndex) return 'complete'
  if (stepIndex === currentStepIndex) return 'current'
  return 'upcoming'
}

export function getTicketBoardWorkflowStepState(
  workflow: TicketBoardWorkflowDefinition,
  status: TicketStatus,
  stepIndex: number,
  currentStepKeyOverride?: string,
): TicketBoardStepState {
  if (status === 'Closed') return 'complete'

  const currentStepKey = currentStepKeyOverride ?? workflow.currentStepKeyByStatus[status]
  if (!currentStepKey) return stepIndex === 0 ? 'current' : 'upcoming'

  const currentStepIndex = workflow.steps.findIndex(step => step.key === currentStepKey)
  if (currentStepIndex < 0) return stepIndex === 0 ? 'current' : 'upcoming'
  if (stepIndex < currentStepIndex) return 'complete'
  if (stepIndex === currentStepIndex) return 'current'
  return 'upcoming'
}

export function applyTicketGuidanceTemplate(
  currentDetail: string,
  guidance: ResolvedTicketSubjectGuidance,
) {
  return currentDetail.trim().length > 0 ? currentDetail : guidance.template
}

export function applyTicketGuidanceSuggestion(
  currentDetail: string,
  suggestion: TicketGuidanceSuggestion,
  guidance: ResolvedTicketSubjectGuidance,
) {
  const baseDetail = currentDetail.trim().length > 0 ? currentDetail : guidance.template
  const lines = baseDetail.split(/\r?\n/)

  if (guidance.suggestionTargetLabel) {
    const targetLineIndex = lines.findIndex(line => line.trim().startsWith(guidance.suggestionTargetLabel!))

    if (targetLineIndex >= 0) {
      lines[targetLineIndex] = `${guidance.suggestionTargetLabel} ${suggestion.value}`
      return lines.join('\n')
    }

    return [`${guidance.suggestionTargetLabel} ${suggestion.value}`, ...lines].join('\n')
  }

  if (lines.some(line => line.trim() === suggestion.value.trim())) {
    return lines.join('\n')
  }

  return [suggestion.value, ...lines].join('\n')
}
