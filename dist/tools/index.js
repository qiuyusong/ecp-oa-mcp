import { z } from 'zod';
import { timesheetService } from '../services/timesheetService.js';
import { projectService } from '../services/projectService.js';
import { taskService } from '../services/taskService.js';
import { approvalService } from '../services/approvalService.js';
import { announcementService } from '../services/announcementService.js';
export function registerTools(server) {
    // ==========================================
    // 1. 工时管理工具 (Timesheet Tools)
    // ==========================================
    server.tool('ecp_get_timereport_dashboard', '获取个人指定日期的工时填报看板（目标工时、已填工时、明细与可选任务）', {
        date: z.string().optional().describe('日期，格式 YYYY-MM-DD，默认今天'),
    }, async ({ date }) => {
        const data = await timesheetService.getDashboard(date);
        return {
            content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
    });
    server.tool('ecp_submit_timesheet', '手工提交个人工时明细到 ECP 系统（支持初次填报与同日追加）', {
        date: z.string().describe('填报日期，格式 YYYY-MM-DD'),
        entries: z
            .array(z.object({
            taskId: z.string().describe('关联任务 ID'),
            hours: z.number().describe('工时数（小时）'),
            description: z.string().describe('工作内容描述'),
            activityType: z.string().optional().describe('活动类型，如“研发”、“会议”、“设计”'),
            activityDetail: z.string().optional().describe('活动明细'),
        }))
            .describe('工时明细列表'),
    }, async (input) => {
        const res = await timesheetService.submitTimesheet(input);
        return {
            content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        };
    });
    server.tool('ecp_update_timesheet_detail', '更新指定的一条工时明细（调整任务、时数、工作描述等）', {
        trpDetailId: z.string().describe('工时明细 ID'),
        hours: z.number().describe('调整后的工时数（小时）'),
        description: z.string().optional().describe('工作内容描述'),
        activityType: z.string().optional().describe('活动类型'),
        taskId: z.string().optional().describe('关联任务 ID'),
        date: z.string().optional().describe('工时所属日期，格式 YYYY-MM-DD'),
    }, async (input) => {
        const res = await timesheetService.updateDetail(input);
        return {
            content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        };
    });
    server.tool('ecp_delete_timesheet_detail', '删除指定的工时明细条目并自动重新计算当日工时', {
        trpDetailId: z.string().describe('待删除的工时明细 ID'),
        timeReportId: z.string().optional().describe('工时主记录 ID（可选）'),
    }, async ({ trpDetailId, timeReportId }) => {
        const res = await timesheetService.deleteDetail(trpDetailId, timeReportId);
        return {
            content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        };
    });
    server.tool('ecp_auto_fill_timesheet_from_git', '【一键填工时】自动扫描本地 Git 仓库当天的 commit 记录，智能分摊工时并提交至 ECP', {
        date: z.string().optional().describe('目标日期，格式 YYYY-MM-DD，默认今天'),
        targetHours: z.number().optional().default(8.0).describe('总填报目标工时，默认 8.0'),
    }, async ({ date, targetHours }) => {
        const res = await timesheetService.autoFillFromGit(date, targetHours);
        return {
            content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        };
    });
    server.tool('ecp_get_team_timesheet_summary', '【主管管理】查询管辖团队或专案成员在指定日期的工时合规与填报大盘', {
        date: z.string().optional().describe('查询日期，格式 YYYY-MM-DD，默认今天'),
        departmentId: z.string().optional().describe('指定部门 ID（可选）'),
    }, async ({ date, departmentId }) => {
        const res = await timesheetService.getTeamTimesheetSummary(date, departmentId);
        return {
            content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        };
    });
    server.tool('ecp_remind_missing_timesheet', '【主管管理】向漏填或未满 8 小时的成员发送系统工时催报通知', {
        userIds: z.array(z.string()).describe('被提醒的成员用户 ID 列表'),
        message: z.string().optional().describe('催填提醒文字内容'),
    }, async ({ userIds, message }) => {
        const res = await timesheetService.remindMembers(userIds, message);
        return {
            content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        };
    });
    // ==========================================
    // 2. 专案管理工具 (Project Tools)
    // ==========================================
    server.tool('ecp_create_project', '创建新专案，默认将专案经理（PM）指定为您本人', {
        name: z.string().describe('专案名称'),
        planStartDate: z.string().describe('计划开始日期，YYYY-MM-DD'),
        planEndDate: z.string().describe('计划结束日期，YYYY-MM-DD'),
        description: z.string().optional().describe('专案背景与目标描述'),
        budgetHours: z.number().optional().describe('专案预算总工时'),
    }, async (input) => {
        const res = await projectService.createProject(input);
        return {
            content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        };
    });
    server.tool('ecp_list_my_managed_projects', '【主管管理】查询我负责或管理的专案大盘（进度率、健康度、延期状态）', {
        status: z.enum(['ACTIVE', 'DELAYED', 'ALL']).optional().default('ALL').describe('专案状态过滤'),
    }, async ({ status }) => {
        const res = await projectService.listMyManagedProjects(status);
        return {
            content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        };
    });
    server.tool('ecp_get_project_health', '【主管管理】深度获取专案健康度、预算工时消耗比例与里程碑达成情况', {
        projectId: z.string().describe('专案 ID'),
    }, async ({ projectId }) => {
        const res = await projectService.getProjectHealth(projectId);
        return {
            content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        };
    });
    // ==========================================
    // 3. 任务管理工具 (Task Tools)
    // ==========================================
    server.tool('ecp_create_task', '创建新任务，支持指派给自己或分派给下属团队成员', {
        projectId: z.string().describe('所属专案 ID'),
        taskName: z.string().describe('任务标题'),
        assigneeId: z.string().optional().describe('指定执行人用户 ID（不填则指派给当前用户本人）'),
        predictHours: z.number().describe('预估工时（小时）'),
        planStartDate: z.string().optional().describe('计划开始日期，YYYY-MM-DD'),
        planEndDate: z.string().describe('交付截止日期，YYYY-MM-DD'),
        description: z.string().optional().describe('任务具体交付要求描述'),
    }, async (input) => {
        const res = await taskService.createTask(input);
        return {
            content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        };
    });
    server.tool('ecp_update_my_task', '更新个人名下任务进度与描述，或提交完结验收', {
        taskId: z.string().describe('任务 ID'),
        progress: z.number().min(0).max(100).describe('任务进度百分比 (0 - 100)'),
        actualHours: z.number().optional().describe('已消耗实际工时'),
        finishDescription: z.string().optional().describe('交付物与完结说明/更新说明'),
        isFinished: z.boolean().optional().default(false).describe('是否标记为已完成并申请验收'),
    }, async (input) => {
        const res = await taskService.updateMyTask(input);
        return {
            content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        };
    });
    server.tool('ecp_list_my_tasks', '查询分配给当前用户的任务列表', {
        status: z.enum(['PENDING', 'IN_PROGRESS', 'FINISHED', 'CLOSED']).optional().describe('按状态筛选'),
    }, async ({ status }) => {
        const res = await taskService.listMyTasks(status);
        return {
            content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        };
    });
    server.tool('ecp_list_team_tasks', '【主管管理】查询团队全部任务，或管辖专案下的执行任务全景', {
        projectId: z.string().optional().describe('按专案筛选'),
        assigneeId: z.string().optional().describe('按成员筛选'),
    }, async (filter) => {
        const res = await taskService.listTeamTasks(filter);
        return {
            content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        };
    });
    server.tool('ecp_audit_task_finish', '【主管管理】验收下属申请完结的任务，通过予以结项，驳回则打回修改', {
        taskId: z.string().describe('任务 ID'),
        approve: z.boolean().describe('是否验收通过：true=通过归档, false=驳回修改'),
        comment: z.string().optional().describe('验收意见或驳回原因说明'),
    }, async ({ taskId, approve, comment }) => {
        const res = await taskService.auditTaskFinish(taskId, approve, comment);
        return {
            content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        };
    });
    // ==========================================
    // 4. 统一审核流程工具 (Unified Approval Tools)
    // ==========================================
    server.tool('oa_list_pending_approvals', '【主管管理】查询当前用户待审批的工作项与流程待办列表（基于底座 WorkItem 引擎）', {
        category: z
            .enum(['CLOCK_REPAIR', 'OVERTIME', 'LEAVE', 'TASK_FINISH', 'PROJECT_DELAY', 'GENERAL_WORKITEM'])
            .optional()
            .describe('流程类别筛选'),
    }, async ({ category }) => {
        const res = await approvalService.listPendingApprovals(category);
        return {
            content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        };
    });
    server.tool('oa_audit_action', '【主管管理】对指定的工作项审批单据执行通过或驳回', {
        approvalId: z.string().describe('审批单据/工作项 ID (workItemId)'),
        action: z.enum(['APPROVE', 'REJECT']).describe('审批结果：APPROVE=通过, REJECT=驳回'),
        comment: z.string().optional().describe('审批意见批语'),
    }, async (input) => {
        const res = await approvalService.auditAction(input);
        return {
            content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        };
    });
    server.tool('oa_batch_audit', '【主管管理】批量快速审批通过选定的待办工作项', {
        approvalIds: z.array(z.string()).describe('待审批工作项 ID 列表'),
        defaultComment: z.string().optional().default('经核实无误，批量审批通过。').describe('统一批语'),
    }, async ({ approvalIds, defaultComment }) => {
        const res = await approvalService.batchAudit(approvalIds, 'APPROVE', defaultComment);
        return {
            content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        };
    });
    // ==========================================
    // 5. 企业公告管理 (Proclamation / Announcement)
    // ==========================================
    server.tool('ecp_list_announcements', '查询企业或部门发布的最新公告列表', {}, async () => {
        const res = await announcementService.listAnnouncements();
        return {
            content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        };
    });
    server.tool('ecp_publish_announcement', '【主管发布】发布新的企业或团队通知公告', {
        title: z.string().describe('公告标题'),
        content: z.string().describe('公告正文内容'),
    }, async ({ title, content }) => {
        const res = await announcementService.publishAnnouncement(title, content);
        return {
            content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        };
    });
}
//# sourceMappingURL=index.js.map