import assert from 'node:assert/strict';
import test from 'node:test';
import axios, { AxiosInstance } from 'axios';
import { actionPath, EcpClient } from '../src/clients/ecpClient.js';

function response(config: any, data: unknown) {
  return { config, data, headers: {}, status: 200, statusText: 'OK' };
}

test('list and ordinary Action endpoints use their respective .data routes', () => {
  assert.equal(actionPath('Ecp.Task.getListData'), '/qsvd-list/Ecp.Task.getListData.data');
  assert.equal(actionPath('Ecp.Task.save'), '/qsvd-action/Ecp.Task.save.data');
});

test('all ECP module Actions used by MCP map to their module-specific routes', () => {
  const routes: Array<[string, string]> = [
    ['Ecp.Project.getListData', '/qsvd-list/Ecp.Project.getListData.data'],
    ['Ecp.Project.save', '/qsvd-action/Ecp.Project.save.data'],
    ['Ecp.ProjectMethod.getListData', '/qsvd-list/Ecp.ProjectMethod.getListData.data'],
    ['Ecp.ProjectMilestone.getListData', '/qsvd-list/Ecp.ProjectMilestone.getListData.data'],
    ['Ecp.Task.getListData', '/qsvd-list/Ecp.Task.getListData.data'],
    ['Ecp.Task.save', '/qsvd-action/Ecp.Task.save.data'],
    ['Ecp.Task.doFinishCheck', '/qsvd-action/Ecp.Task.doFinishCheck.data'],
    ['Ecp.Task.submit', '/qsvd-action/Ecp.Task.submit.data'],
    ['Ecp.TimeReport.getActivityTypeItem', '/qsvd-action/Ecp.TimeReport.getActivityTypeItem.data'],
    ['Ecp.TimeReport.getAllDetailDatas', '/qsvd-action/Ecp.TimeReport.getAllDetailDatas.data'],
    ['Ecp.TimeReport.getAllRelevantObjs', '/qsvd-action/Ecp.TimeReport.getAllRelevantObjs.data'],
    ['Ecp.TimeReport.getCurProgress', '/qsvd-action/Ecp.TimeReport.getCurProgress.data'],
    ['Ecp.TimeReport.addMainUnitEntity', '/qsvd-action/Ecp.TimeReport.addMainUnitEntity.data'],
    ['Ecp.TimeReport.addDetails', '/qsvd-action/Ecp.TimeReport.addDetails.data'],
  ];

  for (const [action, expectedPath] of routes) {
    assert.equal(actionPath(action), expectedPath, action);
  }
});

test('Action route builder rejects malformed Action names', () => {
  assert.throws(() => actionPath('Ecp.Task'), /Invalid ECP Action name/);
  assert.throws(() => actionPath('Ecp.Task.save/other'), /Invalid ECP Action name/);
});

test('account token is applied and sent in the Action request body', async () => {
  const requests: Array<{ url?: string; data?: string }> = [];
  const client = axios.create({
    adapter: async (config) => {
      requests.push({ url: config.url, data: config.data });
      return response(config, config.url === '/openapi/aile/token/apply'
        ? { _header_: { success: true }, tokenId: 'test-token', user: { id: 'user-1' } }
        : { _header_: { success: true }, data: { records: [] } });
    },
  }) as AxiosInstance;
  const ecp = new EcpClient({
    baseUrl: 'https://ecp.example/ecp',
    username: 'account',
    password: 'password',
    client,
  });

  const result = await ecp.postAction('Ecp.Task.getListData');
  const login = JSON.parse(requests[0].data!);
  const action = JSON.parse(requests[1].data!);

  assert.equal(requests[0].url, '/openapi/aile/token/apply');
  assert.equal(login.loginType, 'account');
  assert.equal(login.loginName, 'account');
  assert.equal(action._header_.tokenId, 'test-token');
  assert.deepEqual(result, { _header_: { success: true }, data: { records: [] } });
  assert.equal(await ecp.getUserId(), 'user-1');
});

test('list page context is encoded in the Action URL while entity filters stay in the JSON body', async () => {
  let requestUrl: string | undefined;
  let requestBody: any;
  const client = axios.create({
    adapter: async (config) => {
      requestUrl = config.url;
      requestBody = JSON.parse(config.data || '{}');
      return response(config, { _header_: { success: true }, data: { records: [] } });
    },
  });
  const ecp = new EcpClient({ tokenId: 'test-token', client });

  await ecp.postAction('Ecp.Task.getListData', {
    pageCode: 'Ecp.Project.TaskList',
    masterEntityId: 'project-1',
  });

  assert.equal(requestUrl, '/qsvd-list/Ecp.Task.getListData.data?pageCode=Ecp.Project.TaskList');
  assert.equal(requestBody.pageCode, undefined);
  assert.equal(requestBody.masterEntityId, 'project-1');
});

test('Action business errors are rejected even when HTTP status is 200', async () => {
  const client = axios.create({
    adapter: async (config) => response(config, config.url === '/openapi/aile/token/apply'
      ? { _header_: { success: true }, tokenId: 'test-token', user: { id: 'user-1' } }
      : { _header_: { success: false, errorCode: 'Qs.Token.Invalid' } }),
  });
  const ecp = new EcpClient({ username: 'account', password: 'password', client });

  await assert.rejects(ecp.postAction('Ecp.Project.getListData'), /Qs\.Token\.Invalid/);
});
