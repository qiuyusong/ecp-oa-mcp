import { ecpClient } from '../clients/ecpClient.js';
import { ProjectModel } from '../types/index.js';

export class ProjectService {
  /**
   * Create a new project (as Project Manager)
   */
  public async createProject(input: {
    name: string;
    planStartDate: string;
    planEndDate: string;
    description?: string;
    budgetHours?: number;
  }): Promise<{ success: boolean; projectId: string; message: string }> {
    const userId = await ecpClient.getUserId();
    const methodResult = await ecpClient.postAction<any>('Ecp.ProjectMethod.getListData');
    const methods = methodResult?.data?.records;
    if (!Array.isArray(methods)) throw new Error('ECP ProjectMethod Action response has no data.records array.');
    const defaultMethod = methods.find((method: any) =>
      method.FIsDefault === true || method.FIsDefault === 1 || method.FIsDefault === '1'
    );
    if (!defaultMethod?.FId) throw new Error('ECP has no available default project method.');

    const res = await ecpClient.postAction<any>('Ecp.Project.save', {
      data: {
        FName: input.name,
        FUserId: userId,
        FProjectMethodId: defaultMethod.FId,
        FPlanStartDate: input.planStartDate,
        FPlanEndDate: input.planEndDate,
        FDescription: input.description,
        FPlanHours: input.budgetHours ?? 0,
      },
    });
    const projectId = res?.entityId || res?.id || res?.data?.entityId || res?.data?.id;
    if (!projectId) throw new Error('ECP Project save Action returned no project ID.');
    return {
      success: true,
      projectId,
      message: `专案「${input.name}」已创建，专案经理为当前用户。`,
    };
  }

  /**
   * Managerial: List projects managed by current user
   */
  public async listMyManagedProjects(status?: 'ACTIVE' | 'DELAYED' | 'ALL'): Promise<ProjectModel[]> {
    const userId = await ecpClient.getUserId();
    const res = await ecpClient.postAction<any>('Ecp.Project.getListData');
    const records = res?.data?.records;
    if (!Array.isArray(records)) throw new Error('ECP Project Action response has no data.records array.');

    return records
      .filter((record: any) => record.FUserId === userId)
      .map((record: any): ProjectModel => {
        const endDate = record.FPlanEndDate?.slice?.(0, 10);
        const rawStatus = String(record.FStatus || '').toLowerCase();
        const isComplete = /finish|complete|success/.test(rawStatus);
        const normalizedStatus: ProjectModel['status'] = isComplete
          ? 'COMPLETED'
          : /discard|archive|fail/.test(rawStatus)
          ? 'ARCHIVED'
          : /overdue|delay/.test(rawStatus) || (endDate && endDate < new Date().toISOString().slice(0, 10))
          ? 'DELAYED'
          : 'ACTIVE';
        return {
          id: record.FId,
          name: record.FName,
          code: record.FSerialNumber,
          managerId: record.FUserId,
          managerName: record['FUserId$'],
          status: normalizedStatus,
          planStartDate: record.FPlanStartDate?.slice?.(0, 10),
          planEndDate: endDate,
          actualEndDate: record.FCompletedDate?.slice?.(0, 10),
          progressRate: Number(record.FProgressRate || 0) / 100,
          budgetHours: Number(record.FPlanHours || 0),
          consumedHours: Number(record.FHours || 0),
          description: record.FDescription,
        };
      })
      .filter((project: ProjectModel) => !status || status === 'ALL' || project.status === status);
  }

  /**
   * Managerial: Get detailed project health report & hour consumption
   */
  public async getProjectHealth(projectId: string): Promise<{
    project: ProjectModel;
    budgetStatus: 'SAFE' | 'WARNING' | 'OVER_BUDGET';
    healthScore: number;
    unresolvedTaskCount: number;
    milestones: Array<{ id: string; name: string; endDate: string; isClosed: boolean }>;
  }> {
    const projects = await this.listMyManagedProjects('ALL');
    const project = projects.find((p) => p.id === projectId);
    if (!project) throw new Error(`No accessible project found with ID ${projectId}.`);
    const [taskResult, milestoneResult] = await Promise.all([
      ecpClient.postAction<any>('Ecp.Task.getListData', {
        pageCode: 'Ecp.Project.TaskList',
        masterEntityId: projectId,
        relationId: '0e5fd255-91da-48b9-b4d3-7b415e4296fd',
      }),
      ecpClient.postAction<any>('Ecp.ProjectMilestone.getListData', {
        pageCode: 'Ecp.Project.ProjectMilestoneList',
        masterEntityId: projectId,
        relationId: '404e7275-bd6b-4ac1-a202-79e3db5e1a32',
      }),
    ]);
    const tasks = taskResult?.data?.records;
    const milestones = milestoneResult?.data?.records;
    if (!Array.isArray(tasks) || !Array.isArray(milestones)) {
      throw new Error('ECP did not return project task and milestone records.');
    }

    const budgetStatus = (project.consumedHours || 0) > (project.budgetHours || 100)
      ? 'OVER_BUDGET'
      : (project.consumedHours || 0) / (project.budgetHours || 100) > 0.85
      ? 'WARNING'
      : 'SAFE';

    return {
      project,
      budgetStatus,
      healthScore: budgetStatus === 'SAFE' ? 95 : budgetStatus === 'WARNING' ? 78 : 55,
      unresolvedTaskCount: tasks.filter((task: any) => task.FProjectId === projectId && !/finish|discard|cancel/i.test(task.FStatus || '')).length,
      milestones: milestones
        .filter((milestone: any) => milestone.FProjectId === projectId)
        .map((milestone: any) => ({
          id: milestone.FId,
          name: milestone.FName,
          endDate: milestone.FFinishDate?.slice?.(0, 10) || milestone.FPlanEndDate?.slice?.(0, 10) || '',
          isClosed: /finish|closed|complete/i.test(milestone.FStatus || ''),
        })),
    };
  }
}

export const projectService = new ProjectService();
