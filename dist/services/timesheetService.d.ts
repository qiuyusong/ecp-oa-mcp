import { TimeReportDashboard, SubmitTimesheetInput, TeamMemberTimesheetSummary } from '../types/index.js';
export declare class TimesheetService {
    /**
     * Get timesheet dashboard for a specific date (today by default)
     */
    getDashboard(dateStr?: string): Promise<TimeReportDashboard>;
    /**
     * Submit timesheet entries
     */
    submitTimesheet(input: SubmitTimesheetInput): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Automatically generate and submit timesheet from Git commits
     */
    autoFillFromGit(dateStr?: string, targetHours?: number, customRepos?: Array<{
        name: string;
        path: string;
    }>): Promise<{
        success: boolean;
        message: string;
        summary?: any;
    }>;
    /**
     * Managerial: Get team members timesheet compliance summary
     */
    getTeamTimesheetSummary(dateStr?: string, departmentId?: string): Promise<{
        date: string;
        totalMembers: number;
        compliantCount: number;
        missingCount: number;
        members: TeamMemberTimesheetSummary[];
    }>;
    /**
     * Managerial: Remind missing or under-hours members
     */
    remindMembers(userIds: string[], message?: string): Promise<{
        success: boolean;
        remindedCount: number;
    }>;
}
export declare const timesheetService: TimesheetService;
