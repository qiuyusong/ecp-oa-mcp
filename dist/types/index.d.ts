export interface TimeReportDashboard {
    date: string;
    todayWorkHours: number;
    targetWorkHours: number;
    completionRate: number;
    isCompliant: boolean;
    tasks: TimeReportTaskItem[];
    details: TimeReportDetailItem[];
}
export interface TimeReportTaskItem {
    id: string;
    taskName: string;
    projectId?: string;
    projectName?: string;
    category?: string;
}
export interface TimeReportDetailItem {
    id: string;
    taskId: string;
    taskName: string;
    workHours: number;
    description?: string;
    createTime?: string;
    activityType?: string;
    activityDetail?: string;
}
export interface SubmitTimesheetInput {
    date: string;
    entries: Array<{
        taskId: string;
        hours: number;
        description: string;
        activityType?: string;
        activityDetail?: string;
    }>;
}
export interface TeamMemberTimesheetSummary {
    userId: string;
    userName: string;
    departmentId?: string;
    date: string;
    totalHours: number;
    isCompliant: boolean;
    details: Array<{
        taskId: string;
        taskName: string;
        hours: number;
        description?: string;
    }>;
}
export interface ProjectModel {
    id: string;
    name: string;
    code?: string;
    managerId: string;
    managerName?: string;
    status: 'ACTIVE' | 'DELAYED' | 'COMPLETED' | 'ARCHIVED';
    planStartDate?: string;
    planEndDate?: string;
    actualEndDate?: string;
    progressRate: number;
    budgetHours?: number;
    consumedHours?: number;
    description?: string;
}
export interface TaskModel {
    id: string;
    projectId: string;
    projectName?: string;
    name: string;
    assigneeId: string;
    assigneeName?: string;
    creatorId?: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'FINISHED' | 'CLOSED';
    predictHours: number;
    actualHours: number;
    progress: number;
    planStartDate?: string;
    planEndDate?: string;
    finishDescription?: string;
    completedDate?: string;
}
export type ClockType = 'CHECK_IN' | 'CHECK_OUT';
export interface ClockStatus {
    date: string;
    isWorkday: boolean;
    shiftName: string;
    planCheckInTime: string;
    planCheckOutTime: string;
    hasCheckedIn: boolean;
    checkInTime?: string;
    hasCheckedOut: boolean;
    checkOutTime?: string;
    status: 'NORMAL' | 'LATE' | 'EARLY_LEAVE' | 'MISSING' | 'NOT_STARTED';
}
export interface ClockPunchResult {
    success: boolean;
    action: ClockType;
    punchTime: string;
    location?: string;
    message: string;
}
export interface TeamAttendanceDashboard {
    date: string;
    totalMembers: number;
    presentCount: number;
    lateCount: number;
    missingCount: number;
    leaveCount: number;
    members: Array<{
        userId: string;
        userName: string;
        status: 'PRESENT' | 'LATE' | 'MISSING' | 'LEAVE';
        checkInTime?: string;
        checkOutTime?: string;
        leaveType?: string;
    }>;
}
export type ApprovalCategory = 'CLOCK_REPAIR' | 'OVERTIME' | 'LEAVE' | 'TASK_FINISH' | 'PROJECT_DELAY';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export interface ApprovalItem {
    id: string;
    category: ApprovalCategory;
    categoryLabel: string;
    applicantId: string;
    applicantName: string;
    submitTime: string;
    status: ApprovalStatus;
    summary: string;
    details: Record<string, any>;
    verificationContext?: {
        suggestedAction: 'APPROVE' | 'REJECT' | 'NEEDS_REVIEW';
        reason: string;
        confidence: number;
        crossCheckData?: {
            timesheetHours?: number;
            gitCommitCount?: number;
            lastCommitTime?: string;
            projectProgress?: number;
        };
    };
}
export interface AuditActionInput {
    approvalId: string;
    action: 'APPROVE' | 'REJECT';
    comment?: string;
}
