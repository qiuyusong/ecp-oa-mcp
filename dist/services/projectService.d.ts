import { ProjectModel } from '../types/index.js';
export declare class ProjectService {
    /**
     * Create a new project (as Project Manager)
     */
    createProject(input: {
        name: string;
        planStartDate: string;
        planEndDate: string;
        description?: string;
        budgetHours?: number;
    }): Promise<{
        success: boolean;
        projectId: string;
        message: string;
    }>;
    /**
     * Managerial: List projects managed by current user
     */
    listMyManagedProjects(status?: 'ACTIVE' | 'DELAYED' | 'ALL'): Promise<ProjectModel[]>;
    /**
     * Managerial: Get detailed project health report & hour consumption
     */
    getProjectHealth(projectId: string): Promise<{
        project: ProjectModel;
        budgetStatus: 'SAFE' | 'WARNING' | 'OVER_BUDGET';
        healthScore: number;
        unresolvedTaskCount: number;
        milestones: Array<{
            id: string;
            name: string;
            endDate: string;
            isClosed: boolean;
        }>;
    }>;
}
export declare const projectService: ProjectService;
