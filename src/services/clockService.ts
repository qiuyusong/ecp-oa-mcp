import {
  ClockStatus,
  ClockType,
  ClockPunchResult,
  TeamAttendanceDashboard,
} from '../types/index.js';

function unsupported(operation: string): never {
  throw new Error(`AIPower source has no attendance Action for ${operation}; configure a documented attendance system integration before using this tool.`);
}

export class ClockService {
  public async getMyStatus(): Promise<ClockStatus> {
    return unsupported('personal clock status');
  }

  public async punch(_action: ClockType, _locationName?: string): Promise<ClockPunchResult> {
    return unsupported('clock punch');
  }

  public async applyClockRepair(_input: {
    date: string;
    punchTime: string;
    type: ClockType;
    reason: string;
  }): Promise<{ success: boolean; applicationId: string; message: string }> {
    return unsupported('clock repair application');
  }

  public async applyOvertime(_input: {
    date: string;
    startTime: string;
    endTime: string;
    hours: number;
    reason: string;
    projectId?: string;
  }): Promise<{ success: boolean; applicationId: string; message: string }> {
    return unsupported('overtime application');
  }

  public async getTeamAttendance(_dateStr?: string): Promise<TeamAttendanceDashboard> {
    return unsupported('team attendance dashboard');
  }

  public async listMyApplications(): Promise<Array<any>> {
    return unsupported('personal application list');
  }
}

export const clockService = new ClockService();
