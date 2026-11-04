import axios, { AxiosInstance } from 'axios';
import { config } from '../config/env.js';

type EcpResponse<T> = T & {
  _header_?: { success?: boolean; errorCode?: string; errorMessage?: string; message?: string };
};

export function actionPath(action: string, query: Record<string, string> = {}): string {
  const parts = action.split('.');
  const method = parts.pop();
  const unit = parts.join('.');
  if (!unit || !method || !/^Ecp(?:\.[A-Za-z0-9_]+)+$/.test(unit) || !/^[A-Za-z0-9_]+$/.test(method)) {
    throw new Error(`Invalid ECP Action name: ${action}`);
  }
  const route = method === 'getListData' ? 'qsvd-list' : 'qsvd-action';
  const queryString = new URLSearchParams(query).toString();
  return `/${route}/${unit}.${method}.data${queryString ? `?${queryString}` : ''}`;
}

export function assertEcpSuccess<T>(path: string, data: EcpResponse<T>): EcpResponse<T> {
  if (data?._header_?.success === false) {
    const header = data._header_;
    throw new Error(`ECP Action Error [${path}]: ${header.errorMessage || header.message || header.errorCode || 'request failed'}`);
  }
  return data;
}

export class EcpClient {
  private readonly client: AxiosInstance;
  private tokenId: string | null = config.ecp.authToken || null;
  private onlineUserId: string | null = config.user.userId || null;
  private loginPromise: Promise<boolean> | null = null;

  constructor(options: {
    baseUrl?: string;
    username?: string;
    password?: string;
    tokenId?: string;
    userId?: string;
    tenantId?: string;
    client?: AxiosInstance;
  } = {}) {
    this.options = {
      baseUrl: options.baseUrl || config.ecp.baseUrl,
      username: options.username ?? config.ecp.username,
      password: options.password ?? config.ecp.password,
      tenantId: options.tenantId ?? config.ecp.tenantId,
    };
    this.tokenId = options.tokenId ?? this.tokenId;
    this.onlineUserId = options.userId ?? this.onlineUserId;
    this.client = options.client || axios.create({
      baseURL: this.options.baseUrl,
      timeout: 15000,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    });
  }

  private readonly options: {
    baseUrl: string;
    username?: string;
    password?: string;
    tenantId?: string;
  };

  public async login(): Promise<boolean> {
    if (this.tokenId) return true;
    if (!this.options.username || !this.options.password) return false;
    if (!this.loginPromise) {
      this.loginPromise = this.applyAccountToken().finally(() => {
        this.loginPromise = null;
      });
    }
    return this.loginPromise;
  }

  private async applyAccountToken(): Promise<boolean> {
    const path = '/openapi/aile/token/apply';
    try {
      const res = await this.client.post(path, {
        loginType: 'account',
        loginName: this.options.username,
        password: this.options.password,
        language: 'zh-tw',
      });
      const data = assertEcpSuccess(path, res.data);
      if (!data.tokenId) throw new Error('ECP login succeeded without tokenId');
      this.tokenId = data.tokenId;
      this.onlineUserId = data.user?.id || data.employee?.id || this.onlineUserId;
      return true;
    } catch (err: any) {
      throw new Error(`ECP login failed: ${err.response?.data?._header_?.errorMessage || err.message || err}`);
    }
  }

  public async getUserId(): Promise<string> {
    if (!this.onlineUserId) {
      await this.login();
    }
    if (!this.onlineUserId) {
      throw new Error('ECP user ID is unavailable; configure valid ECP credentials or USER_ID.');
    }
    return this.onlineUserId;
  }

  public async postAction<T = any>(action: string, payload: Record<string, any> = {}): Promise<T> {
    if (!await this.login()) {
      throw new Error('ECP credentials are required to call Action endpoints.');
    }
    const { pageCode, ...actionArgs } = payload;
    const path = actionPath(action, typeof pageCode === 'string' ? { pageCode } : {});
    const request = {
      ...actionArgs,
      _header_: { ...(payload._header_ || {}), tokenId: this.tokenId },
    };
    try {
      const res = await this.client.post(path, request);
      return assertEcpSuccess(path, res.data) as T;
    } catch (err: any) {
      if (err.message?.startsWith(`ECP Action Error [${path}]:`)) throw err;
      const detail = err.response?.data?._header_?.errorMessage
        || err.response?.data?._header_?.message
        || err.response?.data?.message
        || err.message;
      throw new Error(`ECP Action Error [${path}]: ${detail}`);
    }
  }

  public async post<T = any>(path: string, payload: Record<string, any> = {}): Promise<T> {
    await this.login();
    try {
      const body = this.tokenId && path.startsWith('/openapi/')
        ? { ...payload, _header_: { ...(payload._header_ || {}), tokenId: this.tokenId } }
        : payload;
      const res = await this.client.post(path, body);
      return assertEcpSuccess(path, res.data) as T;
    } catch (err: any) {
      throw new Error(`ECP API Error [${path}]: ${err.response?.data?._header_?.errorMessage || err.response?.data?.message || err.message}`);
    }
  }

  public async get<T = any>(path: string, params: Record<string, any> = {}): Promise<T> {
    await this.login();
    try {
      const res = await this.client.get(path, { params });
      return res.data;
    } catch (err: any) {
      throw new Error(`ECP API Error [${path}]: ${err.response?.data?.message || err.message}`);
    }
  }
}

export const ecpClient = new EcpClient();
