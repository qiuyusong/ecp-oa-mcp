import { TaskModel } from '../types/index.js';
export declare class TaskService {
    /**
     * Create a task (assign to oneself or a team member)
     */
    createTask(input: {
        projectId: string;
        taskName: string;
        assigneeId?: string;
        predictHours: number;
        planStartDate?: string;
        planEndDate: string;
        description?: string;
    }): Promise<{
        success: boolean;
        taskId: string;
        message: string;
    }>;
    /**
     * Personal: Update progress or submit completion for personal task
     */
    updateMyTask(input: {
        taskId: string;
        progress: number;
        actualHours?: number;
        finishDescription?: string;
        isFinished?: boolean;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Personal: List my tasks
     */
    listMyTasks(status?: 'PENDING' | 'IN_PROGRESS' | 'FINISHED' | 'CLOSED'): Promise<TaskModel[]>;
    /**
     * Managerial: List all tasks under team or managed projects
     */
    listTeamTasks(filter?: {
        projectId?: string;
        assigneeId?: string;
        isOverdue?: boolean;
    }): Promise<TaskModel[]>;
    /**
     * Managerial: Audit / Accept task completion
     */
    auditTaskFinish(taskId: string, approve: boolean, comment?: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
export declare const taskService: TaskService;
