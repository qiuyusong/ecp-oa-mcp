function unsupported(operation) {
    throw new Error(`AIPower source has no attendance Action for ${operation}; configure a documented attendance system integration before using this tool.`);
}
export class ClockService {
    async getMyStatus() {
        return unsupported('personal clock status');
    }
    async punch(_action, _locationName) {
        return unsupported('clock punch');
    }
    async applyClockRepair(_input) {
        return unsupported('clock repair application');
    }
    async applyOvertime(_input) {
        return unsupported('overtime application');
    }
    async getTeamAttendance(_dateStr) {
        return unsupported('team attendance dashboard');
    }
    async listMyApplications() {
        return unsupported('personal application list');
    }
}
export const clockService = new ClockService();
//# sourceMappingURL=clockService.js.map