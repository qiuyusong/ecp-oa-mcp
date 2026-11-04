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
        projects: Array<{
            name: string;
            path: string;
        }>;
        defaultDailyHours: number;
    };
}
export declare const config: Config;
