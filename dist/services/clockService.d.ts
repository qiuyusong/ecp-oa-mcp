import { ClockStatus, ClockType, ClockPunchResult, TeamAttendanceDashboard } from '../types/index.js';
export declare class ClockService {
    getMyStatus(): Promise<ClockStatus>;
    punch(_action: ClockType, _locationName?: string): Promise<ClockPunchResult>;
    applyClockRepair(_input: {
        date: string;
        punchTime: string;
        type: ClockType;
        reason: string;
    }): Promise<{
        success: boolean;
        applicationId: string;
        message: string;
    }>;
    applyOvertime(_input: {
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
    getTeamAttendance(_dateStr?: string): Promise<TeamAttendanceDashboard>;
    listMyApplications(): Promise<Array<any>>;
}
export declare const clockService: ClockService;
