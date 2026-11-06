import dotenv from 'dotenv';
dotenv.config();
function parseGitProjects(raw) {
    if (!raw)
        return [];
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
const ecpBaseUrl = process.env.ECP_BASE_URL || 'https://your-ecp-domain.com/ecp';
export const config = {
    ecp: {
        baseUrl: ecpBaseUrl,
        username: process.env.ECP_USERNAME,
        password: process.env.ECP_PASSWORD,
        tenantId: process.env.ECP_TENANT_ID,
        authToken: process.env.ECP_AUTH_TOKEN,
    },
    oa: {
        // 共用 ECP URL，若未指定 OA_BASE_URL 则直接回退使用 ECP_BASE_URL
        baseUrl: process.env.OA_BASE_URL || ecpBaseUrl,
        authToken: process.env.OA_AUTH_TOKEN || process.env.ECP_AUTH_TOKEN,
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
//# sourceMappingURL=env.js.map