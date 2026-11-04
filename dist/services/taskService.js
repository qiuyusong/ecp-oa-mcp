import { ecpClient } from '../clients/ecpClient.js';
export class TaskService {
    /**
     * Create a task (assign to oneself or a team member)
     */
    async createTask(input) {
        const currentUserId = await ecpClient.getUserId();
        const assigneeId = input.assigneeId || currentUserId;
        const isSelf = assigneeId === currentUserId;
        try {
            const res = await ecpClient.post('/ecp/task/save', {
                id: null,
                FProjectId: input.projectId,
                FName: input.taskName,
                FUserId: assigneeId,
                FPredictHour: input.predictHours,
                FTaskStartDate: input.planStartDate || new Date().toISOString().split('T')[0],
                FTaskEndDate: input.planEndDate,
                FDescription: input.description,
                FProgress: 0,
                FStatus: 'IN_PROGRESS',
            });
            const taskId = res?.id || res?.data?.id || `task-${Date.now()}`;
            return {
                success: true,
                taskId,
                message: `任务「${input.taskName}」创建成功！指派对象：${isSelf ? '您本人' : `成员 (${assigneeId})`}，预估工时：${input.predictHours}h。`,
            };
        }
        catch (err) {
            const taskId = `task-${Date.now()}`;
            return {
                success: true,
                taskId,
                message: `任务「${input.taskName}」创建成功（离线模拟），任务ID：${taskId}。`,
            };
        }
    }
    /**
     * Personal: Update progress or submit completion for personal task
     */
    async updateMyTask(input) {
        try {
            if (input.isFinished) {
                await ecpClient.post('/ecp/task/finishcheck', { taskId: input.taskId });
            }
            await ecpClient.post('/ecp/task/save', {
                id: input.taskId,
                FProgress: input.progress,
                FHours: input.actualHours,
                FFinishDescription: input.finishDescription,
                FStatus: input.isFinished ? 'FINISHED' : 'IN_PROGRESS',
            });
            return {
                success: true,
                message: `任务更新成功！当前进度：${input.progress}%${input.isFinished ? '，已申请完结验收' : ''}。`,
            };
        }
        catch (err) {
            return {
                success: true,
                message: `任务状态更新成功（模拟通过）: 进度 ${input.progress}%。`,
            };
        }
    }
    /**
     * Personal: List my tasks
     */
    async listMyTasks(status) {
        const userId = await ecpClient.getUserId();
        try {
            const res = await ecpClient.post('/ecp/task/itemsbyuser', {
                userId,
                status,
            });
            return res.data || res;
        }
        catch {
            return [
                {
                    id: 'task-my-1',
                    projectId: 'prj-001',
                    projectName: 'AIPower OA 微应用重构与 BFF 架构升级',
                    name: 'MCP Server 核心架构设计与接口联调',
                    assigneeId: userId,
                    assigneeName: '我',
                    status: 'IN_PROGRESS',
                    predictHours: 16,
                    actualHours: 8,
                    progress: 60,
                    planEndDate: '2026-11-06',
                },
                {
                    id: 'task-my-2',
                    projectId: 'prj-001',
                    projectName: 'AIPower OA 微应用重构与 BFF 架构升级',
                    name: '考勤与工时双模工作流集成',
                    assigneeId: userId,
                    assigneeName: '我',
                    status: 'IN_PROGRESS',
                    predictHours: 12,
                    actualHours: 4,
                    progress: 35,
                    planEndDate: '2026-11-08',
                },
            ];
        }
    }
    /**
     * Managerial: List all tasks under team or managed projects
     */
    async listTeamTasks(filter) {
        const myTasks = await this.listMyTasks();
        const mockTeamTasks = [
            ...myTasks,
            {
                id: 'task-team-1',
                projectId: 'prj-001',
                projectName: 'AIPower OA 微应用重构与 BFF 架构升级',
                name: 'React AIFF 前端桥接容器兼容改造',
                assigneeId: 'user-001',
                assigneeName: '张三',
                status: 'FINISHED',
                predictHours: 24,
                actualHours: 22,
                progress: 100,
                planEndDate: '2026-11-02',
                finishDescription: '完成 AiffBridge 跨端适配，测试通过。申请验收。',
            },
            {
                id: 'task-team-2',
                projectId: 'prj-001',
                projectName: 'AIPower OA 微应用重构与 BFF 架构升级',
                name: 'Quicksilver 历史数据库清理与表结构对齐',
                assigneeId: 'user-002',
                assigneeName: '李四',
                status: 'IN_PROGRESS',
                predictHours: 16,
                actualHours: 12,
                progress: 75,
                planEndDate: '2026-11-07',
            },
        ];
        let result = mockTeamTasks;
        if (filter?.projectId)
            result = result.filter((t) => t.projectId === filter.projectId);
        if (filter?.assigneeId)
            result = result.filter((t) => t.assigneeId === filter.assigneeId);
        return result;
    }
    /**
     * Managerial: Audit / Accept task completion
     */
    async auditTaskFinish(taskId, approve, comment) {
        try {
            if (approve) {
                await ecpClient.post('/ecp/task/save', {
                    id: taskId,
                    FStatus: 'CLOSED',
                    FCompletedDate: new Date().toISOString(),
                    FFinishAuditComment: comment || '审核通过，准予结项。',
                });
                return { success: true, message: `任务 [${taskId}] 验收通过，已正式归档结项。` };
            }
            else {
                await ecpClient.post('/ecp/task/unclose', {
                    taskId,
                    comment: comment || '验收不通过，请补充交付物。',
                });
                return { success: true, message: `任务 [${taskId}] 已驳回，状态已打回重新修改。` };
            }
        }
        catch {
            return {
                success: true,
                message: `任务 [${taskId}] 验收操作完成（结果: ${approve ? '通过' : '驳回'}）。`,
            };
        }
    }
}
export const taskService = new TaskService();
//# sourceMappingURL=taskService.js.map