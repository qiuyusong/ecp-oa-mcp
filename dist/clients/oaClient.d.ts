export declare class OaClient {
    private client;
    private isIndependentHost;
    constructor();
    post<T = any>(path: string, payload?: Record<string, any>): Promise<T>;
    get<T = any>(path: string, params?: Record<string, any>): Promise<T>;
}
export declare const oaClient: OaClient;
