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

export type TicketManagementScopeDto = {
  companies: TicketLookupCompanyDto[]
  departments: TicketLookupDepartmentDto[]
}

export type TicketAttachmentDto = {
  id: string
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
  requesterEmployeeId: string
  requesterName: string
  sourceCompanyId: string
  sourceDepartmentId?: string
  targetCompanyId: string
  targetCompanyName: string
  targetDepartmentId: string
  targetDepartmentName: string
  categoryId: string
  categoryName: string
  topicId: string
  topicName: string
  otherTopicText?: string
  title: string
  detail: string
  priority: TicketPriority
  status: TicketStatus
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
  requesterEmployeeId: string
  requesterName: string
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
  createdAt: string
}

export type MyTicketItemDto = {
  id: string
  ticketNo: string
  title: string
  status: TicketStatus
  priority: TicketPriority
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
  requesterEmployeeId: string
  requesterName: string
  sourceCompanyId: string
  sourceCompanyName: string
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
  otherTopicText?: string
  title: string
  detail: string
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
  attachments: TicketAttachmentDto[]
  latestCancellationRequest?: TicketCancellationRequestDto
  auditEvents: TicketAuditEventDto[]
  actions: TicketActionFlagsDto
  createdAt: string
  updatedAt: string
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
  categoryName: string
  topicName: string
  vehicleText?: string
  locationText?: string
  assignedAt: string
  workStartedAt?: string
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
