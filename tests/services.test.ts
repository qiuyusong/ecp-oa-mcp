import assert from 'node:assert/strict';
import test from 'node:test';
import { ecpClient } from '../src/clients/ecpClient.js';
import { ProjectService } from '../src/services/projectService.js';
import { TaskService } from '../src/services/taskService.js';
import { TimesheetService } from '../src/services/timesheetService.js';

async function withEcpMocks<T>(
  mocks: {
    getUserId?: () => Promise<string>;
    postAction: (action: string, payload?: Record<string, any>) => Promise<any>;
  },
  run: () => Promise<T>
): Promise<T> {
  const client = ecpClient as any;
  const originalGetUserId = client.getUserId;
  const originalPostAction = client.postAction;
  client.getUserId = mocks.getUserId || (async () => 'user-1');
  client.postAction = mocks.postAction;
  try {
    return await run();
  } finally {
    client.getUserId = originalGetUserId;
    client.postAction = originalPostAction;
  }
}

test('project health scopes task and milestone list Actions to the selected project', async () => {
  const requests: Array<{ action: string; payload: Record<string, any> }> = [];
  const projectId = 'project-1';
  const service = new ProjectService();

  await withEcpMocks({
    postAction: async (action, payload = {}) => {
      requests.push({ action, payload });
      if (action === 'Ecp.Project.getListData') {
        return { data: { records: [{ FId: projectId, FName: 'Project', FSerialNumber: 'PRJ-001', FUserId: 'user-1', FPlanHours: 40 }] } };
      }
      if (action === 'Ecp.Task.getListData') return { data: { records: [] } };
      if (action === 'Ecp.ProjectMilestone.getListData') return { data: { records: [] } };
      throw new Error(`Unexpected Action ${action}`);
    },
  }, async () => service.getProjectHealth(projectId));

  assert.deepEqual(requests.find((request) => request.action === 'Ecp.Task.getListData')?.payload, {
    pageCode: 'Ecp.Project.TaskList',
    masterEntityId: projectId,
    relationId: '0e5fd255-91da-48b9-b4d3-7b415e4296fd',
  });
  assert.deepEqual(requests.find((request) => request.action === 'Ecp.ProjectMilestone.getListData')?.payload, {
    pageCode: 'Ecp.Project.ProjectMilestoneList',
    masterEntityId: projectId,
    relationId: '404e7275-bd6b-4ac1-a202-79e3db5e1a32',
  });
  const listedProject = await withEcpMocks({
    postAction: async () => ({
      data: { records: [{ FId: projectId, FName: 'Project', FSerialNumber: 'PRJ-001', FUserId: 'user-1' }] },
    }),
  }, async () => service.listMyManagedProjects());
  assert.equal(listedProject[0].code, 'PRJ-001');
});

test('project creation resolves and submits the required default project method', async () => {
  const requests: Array<{ action: string; payload: Record<string, any> }> = [];
  const service = new ProjectService();

  const result = await withEcpMocks({
    postAction: async (action, payload = {}) => {
      requests.push({ action, payload });
      if (action === 'Ecp.ProjectMethod.getListData') {
        return { data: { records: [{ FId: 'method-default', FIsDefault: 1 }] } };
      }
      if (action === 'Ecp.Project.save') return { entityId: 'created-project' };
      throw new Error(`Unexpected Action ${action}`);
    },
  }, async () => service.createProject({
    name: 'New project',
    planStartDate: '2026-11-04',
    planEndDate: '2026-12-04',
  }));

  assert.equal(result.projectId, 'created-project');
  assert.deepEqual(requests.map(({ action }) => action), ['Ecp.ProjectMethod.getListData', 'Ecp.Project.save']);
  assert.equal(requests[1].payload.data.FProjectMethodId, 'method-default');
  assert.equal(requests[1].payload.data.FPlanHours, 0);
});

test('task creation sends the task description field used by AIPower', async () => {
  let savePayload: Record<string, any> | undefined;
  const service = new TaskService();

  await withEcpMocks({
    postAction: async (action, payload = {}) => {
      assert.equal(action, 'Ecp.Task.save');
      savePayload = payload;
      return { entityId: 'created-task' };
    },
  }, async () => service.createTask({
    projectId: 'project-1',
    taskName: 'Task',
    predictHours: 4,
    planEndDate: '2026-11-10',
    description: 'Detailed requirements',
  }));

  assert.equal(savePayload?.data.FTaskDescription, 'Detailed requirements');
});

test('team task overdue filter excludes tasks whose planned end date has passed', async () => {
  const service = new TaskService();

  const tasks = await withEcpMocks({
    postAction: async () => ({
      data: {
        records: [
          { FId: 'late', FName: 'Late task', FStatus: 'Executing', FPredictEndDate: '2020-01-01' },
          { FId: 'future', FName: 'Future task', FStatus: 'Executing', FPredictEndDate: '2999-01-01' },
        ],
      },
    }),
  }, async () => service.listTeamTasks({ isOverdue: true }));

  assert.deepEqual(tasks.map((task) => task.id), ['late']);
});

test('timesheet dashboard maps the Action WorkDescription field', async () => {
  const service = new TimesheetService();

  const dashboard = await withEcpMocks({
    postAction: async (action) => action === 'Ecp.TimeReport.getAllRelevantObjs'
      ? { taskItems: [{ text: 'Task', value: 'task-1' }] }
      : { datas: [{ FId: 'detail-1', FTaskId: 'task-1', FTaskName: 'Task', FWorkTime: 2, FWorkDescription: 'Implemented feature' }] },
  }, async () => service.getDashboard('2026-11-04'));

  assert.equal(dashboard.details[0].description, 'Implemented feature');
});

test('timesheet date ordering is checked only during the preflight Action', async () => {
  const requests: Array<{ action: string; payload: Record<string, any> }> = [];
  const service = new TimesheetService();

  await withEcpMocks({
    postAction: async (action, payload = {}) => {
      requests.push({ action, payload });
      if (action === 'Ecp.TimeReport.getActivityTypeItem') return { typeItems: [{ value: 'development', text: '研发' }] };
      if (action === 'Ecp.TimeReport.getAllRelevantObjs') return { taskItems: [] };
      if (action === 'Ecp.TimeReport.getAllDetailDatas') return { datas: [] };
      if (action === 'Ecp.TimeReport.getCurProgress') return { progress: 35 };
      if (action === 'Ecp.TimeReport.addMainUnitEntity') {
        return payload.couldSave === 0
          ? { whatTime: -1, mainEntity: 0 }
          : { state: 'ok', entityIds: ['report-1'] };
      }
      if (action === 'Ecp.TimeReport.addDetails') return { state: 'ok' };
      throw new Error(`Unexpected Action ${action}`);
    },
  }, async () => service.submitTimesheet({
    date: '2026-11-03',
    entries: [{ taskId: 'task-1', hours: 2, description: 'Work', activityType: '研发' }],
  }));

  const mainRequests = requests.filter(({ action }) => action === 'Ecp.TimeReport.addMainUnitEntity');
  assert.equal(mainRequests[0].payload.getLastRecordByuser, 1);
  assert.equal(mainRequests[0].payload.couldSave, 0);
  assert.equal(mainRequests[1].payload.getLastRecordByuser, undefined);
  assert.equal(mainRequests[1].payload.couldSave, 1);
  assert.equal(mainRequests[1].payload.actualWorkvalue, 0);
  const details = requests.find(({ action }) => action === 'Ecp.TimeReport.addDetails')?.payload;
  assert.equal(details?.jsonData[0].progress, 35);
  assert.equal(details?.allDetails[0].progress, 35);
});

test('timesheet submission rejects rows that violate the page required fields and hour limits', async (t) => {
  const invalidInputs = [
    { name: 'no entries', entries: [] },
    { name: 'missing activity type', entries: [{ taskId: 'task-1', hours: 1, description: 'Work' }] },
    { name: 'unknown activity type', entries: [{ taskId: 'task-1', hours: 1, description: 'Work', activityType: 'invalid' }] },
    { name: 'missing hours', entries: [{ taskId: 'task-1', hours: Number.NaN, description: 'Work', activityType: '研发' }] },
    { name: 'zero hours', entries: [{ taskId: 'task-1', hours: 0, description: 'Work', activityType: '研发' }] },
    { name: 'negative hours', entries: [{ taskId: 'task-1', hours: -1, description: 'Work', activityType: '研发' }] },
    { name: 'more than 24 hours', entries: [{ taskId: 'task-1', hours: 24.1, description: 'Work', activityType: '研发' }] },
  ];

  for (const input of invalidInputs) {
    await t.test(input.name, async () => {
      let mainActionCalled = false;
      const service = new TimesheetService();
      await withEcpMocks({
        postAction: async (action) => {
          if (action === 'Ecp.TimeReport.getActivityTypeItem') return { typeItems: [{ value: 'development', text: '研发' }] };
          if (action === 'Ecp.TimeReport.getAllRelevantObjs') return { taskItems: [] };
          if (action === 'Ecp.TimeReport.getAllDetailDatas') return { datas: [] };
          if (action === 'Ecp.TimeReport.addMainUnitEntity') mainActionCalled = true;
          throw new Error(`Unexpected Action ${action}`);
        },
      }, async () => assert.rejects(
        service.submitTimesheet({ date: '2026-11-04', entries: input.entries as any }),
        /detail|activity type|work hours|24/i,
      ));
      assert.equal(mainActionCalled, false);
    });
  }
});
