import dotenv from 'dotenv';
dotenv.config();

export interface Config {
  ecp: {
    baseUrl: string;
    username?: string;
    password?: string;
    tenantId?: string;
    authToken?: string;
  };
  oa: {
    baseUrl: string;
    authToken?: string;
  };
  user: {
    userId?: string;
    userName?: string;
    departmentId?: string;
  };
  git: {
    projects: Array<{ name: string; path: string }>;
    defaultDailyHours: number;
  };
}

function parseGitProjects(raw?: string): Array<{ name: string; path: string }> {
  if (!raw) return [];
  return raw
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [name, path] = item.split('=');
      return { name: name?.trim() || '', path: path?.trim() || '' };
    })
    .filter((p) => p.name && p.path);
}

export const config: Config = {
  ecp: {
    baseUrl: process.env.ECP_BASE_URL || 'https://econtact.gemfor.com.tw/ecp',
    username: process.env.ECP_USERNAME,
    password: process.env.ECP_PASSWORD,
    tenantId: process.env.ECP_TENANT_ID,
    authToken: process.env.ECP_AUTH_TOKEN,
  },
  oa: {
    baseUrl: process.env.OA_BASE_URL || 'http://localhost:12822',
    authToken: process.env.OA_AUTH_TOKEN,
  },
  user: {
    userId: process.env.USER_ID,
    userName: process.env.USER_NAME,
    departmentId: process.env.USER_DEPARTMENT_ID,
  },
  git: {
    projects: parseGitProjects(process.env.GIT_PROJECTS),
    defaultDailyHours: parseFloat(process.env.DEFAULT_DAILY_HOURS || '8.0'),
  },
};
