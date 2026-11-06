import { timesheetService } from '../services/timesheetService.js';
import { taskService } from '../services/taskService.js';
import { approvalService } from '../services/approvalService.js';
import { announcementService } from '../services/announcementService.js';
export function registerResources(server) {
    // Resource 1: Today's Timesheet Overview
    server.resource('today-timesheet', 'ecp://timereport/today', {
        description: '今日个人工时填报达成情况与明细',
        mimeType: 'application/json',
    }, async (uri) => {
        const data = await timesheetService.getDashboard();
        return {
            contents: [
                {
                    uri: uri.href,
                    text: JSON.stringify(data, null, 2),
                },
            ],
        };
    });
    // Resource 2: My Pending Tasks
    server.resource('my-pending-tasks', 'ecp://tasks/my-pending', {
        description: '当前用户负责的进行中任务列表',
        mimeType: 'application/json',
    }, async (uri) => {
        const data = await taskService.listMyTasks('IN_PROGRESS');
        return {
            contents: [
                {
                    uri: uri.href,
                    text: JSON.stringify(data, null, 2),
                },
            ],
        };
    });
    // Resource 3: Pending Approval Queue
    server.resource('pending-approvals', 'oa://approvals/pending', {
        description: '当前待审批单据池快照（基于底座 WorkItem 待办列表）',
        mimeType: 'application/json',
    }, async (uri) => {
        const data = await approvalService.listPendingApprovals();
        return {
            contents: [
                {
                    uri: uri.href,
                    text: JSON.stringify(data, null, 2),
                },
            ],
        };
    });
    // Resource 4: Latest Announcements
    server.resource('latest-announcements', 'ecp://announcements/latest', {
        description: '企业最新公告与通知列表',
        mimeType: 'application/json',
    }, async (uri) => {
        const data = await announcementService.listAnnouncements();
        return {
            contents: [
                {
                    uri: uri.href,
                    text: JSON.stringify(data, null, 2),
                },
            ],
        };
    });
}
//# sourceMappingURL=index.js.map