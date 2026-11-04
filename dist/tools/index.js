import { z } from 'zod';
import { timesheetService } from '../services/timesheetService.js';
import { clockService } from '../services/clockService.js';
import { projectService } from '../services/projectService.js';
import { taskService } from '../services/taskService.js';
import { approvalService } from '../services/approvalService.js';
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
    server.tool('ecp_submit_timesheet', '手工提交个人工时明细到 ECP 系统', {
        date: z.string().describe('填报日期，格式 YYYY-MM-DD'),
        entries: z
            .array(z.object({
            taskId: z.string().describe('关联任务 ID'),
            hours: z.number().describe('工时数（小时）'),
            description: z.string().describe('工作内容描述'),
            activityType: z.string().optional().describe('活动类型，如“研发”、“会议”、“休假”'),
            activityDetail: z.string().optional().describe('活动明细'),
        }))
            .describe('工时明细列表'),
    }, async (input) => {
        const res = await timesheetService.submitTimesheet(input);
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
    server.tool('ecp_get_team_timesheet_summary', '【主管管理】获取下属团队成员在指定日期的工时合规概况（未填/漏填/不足8h人员）', {
        date: z.string().optional().describe('查询日期，格式 YYYY-MM-DD，默认今天'),
        departmentId: z.string().optional().describe('指定部门 ID'),
    }, async ({ date, departmentId }) => {
        const res = await timesheetService.getTeamTimesheetSummary(date, departmentId);
        return {
            content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        };
    });
    server.tool('ecp_remind_missing_timesheet', '【主管管理】对未填或少填工时的团队成员发送一键催报提醒', {
        userIds: z.array(z.string()).describe('被提醒的成员用户 ID 列表'),
        message: z.string().optional().describe('催填提醒文字内容'),
    }, async ({ userIds, message }) => {
        const res = await timesheetService.remindMembers(userIds, message);
        return {
            content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        };
    });
    // ==========================================
    // 2. 考勤打卡与个人申请工具 (Clock & Attendance)
    // ==========================================
    server.tool('oa_get_clock_status', '查询个人今日排班与考勤打卡状态（上班卡/下班卡是否已打、时间点）', {}, async () => {
        const res = await clockService.getMyStatus();
        return {
            content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        };
    });
    server.tool('oa_punch_clock', '执行上班打卡或下班打卡', {
        action: z.enum(['CHECK_IN', 'CHECK_OUT']).describe('打卡动作：CHECK_IN=上班打卡, CHECK_OUT=下班打卡'),
        locationName: z.string().optional().default('办公室 WiFi / 正常').describe('打卡地点备注'),
    }, async ({ action, locationName }) => {
        const res = await clockService.punch(action, locationName);
        return {
            content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        };
    });
    server.tool('oa_apply_clock_repair', '【个人申请】因漏打卡等原因发起补卡申请', {
        date: z.string().describe('补卡日期，格式 YYYY-MM-DD'),
        punchTime: z.string().describe('补卡具体时间，如 18:30:00'),
        type: z.enum(['CHECK_IN', 'CHECK_OUT']).describe('补卡类型：上班卡 / 下班卡'),
        reason: z.string().describe('补卡详细原因'),
    }, async (input) => {
        const res = await clockService.applyClockRepair(input);
        return {
            content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        };
    });
    server.tool('oa_apply_overtime', '【个人申请】因工作需要发起加班申请', {
        date: z.string().describe('加班日期，格式 YYYY-MM-DD'),
        startTime: z.string().describe('开始时间，如 18:00:00'),
        endTime: z.string().describe('结束时间，如 20:30:00'),
        hours: z.number().describe('折算加班时数，如 2.5'),
        reason: z.string().describe('加班事由'),
        projectId: z.string().optional().describe('关联专案 ID'),
    }, async (input) => {
        const res = await clockService.applyOvertime(input);
        return {
            content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        };
    });
    server.tool('oa_list_my_applications', '查询个人提交的审批单流转状态（补卡、加班、请假）', {}, async () => {
        const res = await clockService.listMyApplications();
        return {
            content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        };
    });
    server.tool('oa_get_team_attendance_dashboard', '【主管管理】查看管辖团队今日考勤出勤看板（正常出勤、迟到、缺卡、请假名单）', {
        date: z.string().optional().describe('查询日期，格式 YYYY-MM-DD，默认今天'),
    }, async ({ date }) => {
        const res = await clockService.getTeamAttendance(date);
        return {
            content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        };
    });
    // ==========================================
    // 3. 专案管理工具 (Project Tools)
    // ==========================================
    server.tool('ecp_create_project', '创建新专案，默认将专案经理（PM）指定为您本人', {
        name: z.string().describe('专案名称'),
        code: z.string().optional().describe('专案编号，如 AIP-2026-X'),
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
    // 4. 任务管理工具 (Task Tools)
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
    server.tool('ecp_update_my_task', '更新个人名下任务进度，或申请完结验收', {
        taskId: z.string().describe('任务 ID'),
        progress: z.number().min(0).max(100).describe('任务进度百分比 (0 - 100)'),
        actualHours: z.number().optional().describe('已消耗实际工时'),
        finishDescription: z.string().optional().describe('交付物与完结说明'),
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
    // 5. 统一审核流程工具 (Unified Approval Tools)
    // ==========================================
    server.tool('oa_list_pending_approvals', '【主管管理】获取待我审批的流程单据池（补卡、加班、请假、任务验收、专案延期），内含 AI 辅助比对建议', {
        category: z
            .enum(['CLOCK_REPAIR', 'OVERTIME', 'LEAVE', 'TASK_FINISH', 'PROJECT_DELAY'])
            .optional()
            .describe('流程类别筛选'),
    }, async ({ category }) => {
        const res = await approvalService.listPendingApprovals(category);
        return {
            content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        };
    });
    server.tool('oa_audit_action', '【主管管理】执行单笔审批操作（通过或驳回）并写入审批批语', {
        approvalId: z.string().describe('审批单据 ID'),
        action: z.enum(['APPROVE', 'REJECT']).describe('审批结果：APPROVE=通过, REJECT=驳回'),
        comment: z.string().optional().describe('审批意见批语'),
    }, async (input) => {
        const res = await approvalService.auditAction(input);
        return {
            content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        };
    });
    server.tool('oa_batch_audit', '【主管管理】对多笔经 AI 预检无异常的合规单据执行一键批量通过', {
        approvalIds: z.array(z.string()).describe('待审批单据 ID 列表'),
        defaultComment: z.string().optional().default('经核实无误，批量审批通过。').describe('统一批语'),
    }, async ({ approvalIds, defaultComment }) => {
        const res = await approvalService.batchAudit(approvalIds, 'APPROVE', defaultComment);
        return {
            content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        };
    });
}
//# sourceMappingURL=index.js.map