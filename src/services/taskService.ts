import { ecpClient } from '../clients/ecpClient.js';
import { TaskModel } from '../types/index.js';

export class TaskService {
  /**
   * Create a task (assign to oneself or a team member)
   */
  public async createTask(input: {
    projectId: string;
    taskName: string;
    assigneeId?: string; // If omitted, assigns to current user
    predictHours: number;
    planStartDate?: string;
    planEndDate: string;
    description?: string;
  }): Promise<{ success: boolean; taskId: string; message: string }> {
    const currentUserId = await ecpClient.getUserId();
    const assigneeId = input.assigneeId || currentUserId;
    const isSelf = assigneeId === currentUserId;

    const res = await ecpClient.postAction<any>('Ecp.Task.save', {
      data: {
        FProjectId: input.projectId,
        FName: input.taskName,
        FUserId: assigneeId,
        FPredictHour: input.predictHours,
        FPredictStartDate: input.planStartDate,
        FPredictEndDate: input.planEndDate,
        FTaskDescription: input.description,
      },
    });
    const taskId = res?.entityId || res?.id || res?.data?.entityId || res?.data?.id;
    if (!taskId) throw new Error('ECP Task save Action returned no task ID.');
    return {
      success: true,
      taskId,
      message: `任务「${input.taskName}」已创建并指派给${isSelf ? '当前用户' : `成员 ${assigneeId}`}。`,
    };
  }

  /**
   * Personal: Update progress or submit completion for personal task
   */
  public async updateMyTask(input: {
    taskId: string;
    progress: number; // 0 - 100
    actualHours?: number;
    finishDescription?: string;
    isFinished?: boolean;
  }): Promise<{ success: boolean; message: string }> {
    if (!input.isFinished) {
      throw new Error('AIPower has no Task Action for directly setting progress or actual hours. Progress and hours are derived from submitted time reports.');
    }
    const check = await ecpClient.postAction<any>('Ecp.Task.doFinishCheck', { taskId: input.taskId });
    if (check?.allFinished === false) throw new Error('Task cannot be submitted for completion until all collaborators finish.');
    const res = await ecpClient.postAction<any>('Ecp.Task.submit', {
      entityIds: [input.taskId],
      data: {
        FFinishDescription: input.finishDescription,
        FCompletedDate: new Date().toISOString(),
      },
      workflowCode: 'Ecp.Task.FinishAudit',
    });
    return {
      success: true,
      message: `任务已提交完结验收。${res?.entityIds?.[0] ? `任务 ID：${res.entityIds[0]}` : ''}`,
    };
  }

  /**
   * Personal: List my tasks
   */
  public async listMyTasks(status?: 'PENDING' | 'IN_PROGRESS' | 'FINISHED' | 'CLOSED'): Promise<TaskModel[]> {
    const userId = await ecpClient.getUserId();
    return this.listTasks('Ecp.Task.getListData', userId, status);
  }

  /**
   * Managerial: List all tasks under team or managed projects
   */
  public async listTeamTasks(filter?: {
    projectId?: string;
    assigneeId?: string;
    isOverdue?: boolean;
  }): Promise<TaskModel[]> {
    let result = await this.listTasks('Ecp.Task.getListData');
    if (filter?.projectId) result = result.filter((t) => t.projectId === filter.projectId);
    if (filter?.assigneeId) result = result.filter((t) => t.assigneeId === filter.assigneeId);
    if (filter?.isOverdue) {
      const today = new Date().toISOString().slice(0, 10);
      result = result.filter((task) => Boolean(task.planEndDate && task.planEndDate < today));
    }
    return result;
  }

  private async listTasks(
    action: string,
    userId?: string,
    requestedStatus?: 'PENDING' | 'IN_PROGRESS' | 'FINISHED' | 'CLOSED'
  ): Promise<TaskModel[]> {
    const res = await ecpClient.postAction<any>(action);
    const records = res?.data?.records;
    if (!Array.isArray(records)) throw new Error('ECP Task Action response has no data.records array.');
    return records
      .filter((record: any) => !userId || record.FUserId === userId)
      .map((record: any): TaskModel => {
        const rawStatus = String(record.FStatus || '').toLowerCase();
        const normalizedStatus: TaskModel['status'] = /finish|audit/.test(rawStatus)
          ? 'FINISHED'
          : /discard|cancel/.test(rawStatus)
          ? 'CLOSED'
          : /new|assign|unassigned/.test(rawStatus)
          ? 'PENDING'
          : 'IN_PROGRESS';
        return {
          id: record.FId,
          projectId: record.FProjectId,
          projectName: record['FProjectId$'],
          name: record.FName,
          assigneeId: record.FUserId,
          assigneeName: record['FUserId$'],
          status: normalizedStatus,
          predictHours: Number(record.FPredictHour || 0),
          actualHours: Number(record.FHours || 0),
          progress: Number(record.FProgress || 0),
          planStartDate: record.FPredictStartDate?.slice?.(0, 10) || record.FTaskStartDate?.slice?.(0, 10),
          planEndDate: record.FPredictEndDate?.slice?.(0, 10) || record.FTaskEndDate?.slice?.(0, 10),
          finishDescription: record.FFinishDescription,
          completedDate: record.FCompletedDate?.slice?.(0, 10),
        };
      })
      .filter((task: TaskModel) => !requestedStatus || task.status === requestedStatus);
  }

  /**
   * Managerial: Audit / Accept task completion
   */
  public async auditTaskFinish(
    taskId: string,
    approve: boolean,
    comment?: string
  ): Promise<{ success: boolean; message: string }> {
    void approve;
    void comment;
    throw new Error(`AIPower exposes task submission through Ecp.Task.submit, but this source does not provide a manager task-audit Action for task ${taskId}.`);
  }
}

export const taskService = new TaskService();
