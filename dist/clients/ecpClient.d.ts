export declare class EcpClient {
    private client;
    private sessionCookie;
    private onlineUserId;
    constructor();
    login(): Promise<boolean>;
    getUserId(): Promise<string>;
    resolveOnlineUserId(): Promise<string | null>;
    post<T = any>(path: string, payload?: Record<string, any>): Promise<T>;
    get<T = any>(path: string, params?: Record<string, any>): Promise<T>;
}
export declare const ecpClient: EcpClient;
