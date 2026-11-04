import { ClockStatus, ClockType, ClockPunchResult, TeamAttendanceDashboard } from '../types/index.js';
export declare class ClockService {
    /**
     * Get personal clock status for today
     */
    getMyStatus(): Promise<ClockStatus>;
    /**
     * Execute punch in or punch out
     */
    punch(action: ClockType, locationName?: string): Promise<ClockPunchResult>;
    /**
     * Apply for clock repair (补卡申请) for oneself
     */
    applyClockRepair(input: {
        date: string;
        punchTime: string;
        type: ClockType;
        reason: string;
    }): Promise<{
        success: boolean;
        applicationId: string;
        message: string;
    }>;
    /**
     * Apply for overtime (加班申请) for oneself
     */
    applyOvertime(input: {
        date: string;
        startTime: string;
        endTime: string;
        hours: number;
        reason: string;
        projectId?: string;
    }): Promise<{
        success: boolean;
        applicationId: string;
        message: string;
    }>;
    /**
     * Managerial: Get team attendance dashboard
     */
    getTeamAttendance(dateStr?: string): Promise<TeamAttendanceDashboard>;
    /**
     * List my submitted applications (clock repair, overtime, leave)
     */
    listMyApplications(): Promise<Array<any>>;
}
export declare const clockService: ClockService;
