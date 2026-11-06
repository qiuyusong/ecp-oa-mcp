
import { ecpClient } from './dist/clients/ecpClient.js';

async function main() {
  await ecpClient.login();
  console.log('User ID:', await ecpClient.getUserId());
  const res = await ecpClient.postAction('Ecp.TimeReport.getAllRelevantObjs', { userId: await ecpClient.getUserId() });
  console.log('getAllRelevantObjs raw response:', JSON.stringify(res, null, 2));
}

main().catch(console.error);
