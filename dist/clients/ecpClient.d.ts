import { AxiosInstance } from 'axios';
type EcpResponse<T> = T & {
    _header_?: {
        success?: boolean;
        errorCode?: string;
        errorMessage?: string;
        message?: string;
    };
    _failed?: boolean;
    code?: string;
    message?: string;
};
export declare function actionPath(action: string, query?: Record<string, string>): string;
export declare function assertEcpSuccess<T>(path: string, data: EcpResponse<T>): EcpResponse<T>;
export declare class EcpClient {
    private readonly client;
    private tokenId;
    private sessionCookie;
    private onlineUserId;
    private loginPromise;
    constructor(options?: {
        baseUrl?: string;
        username?: string;
        password?: string;
        tokenId?: string;
        userId?: string;
        tenantId?: string;
        client?: AxiosInstance;
    });
    private readonly options;
    login(): Promise<boolean>;
    private applyAccountToken;
    private updateSessionCookies;
    private sessionConfig;
    getUserId(): Promise<string>;
    postAction<T = any>(action: string, payload?: Record<string, any>): Promise<T>;
    post<T = any>(path: string, payload?: Record<string, any>): Promise<T>;
    get<T = any>(path: string, params?: Record<string, any>): Promise<T>;
}
export declare const ecpClient: EcpClient;
export {};
