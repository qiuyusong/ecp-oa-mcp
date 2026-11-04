import axios, { AxiosInstance } from 'axios';
import { config } from '../config/env.js';
import { ecpClient } from './ecpClient.js';

export class OaClient {
  private client: AxiosInstance | null = null;
  private isIndependentHost: boolean;

  constructor() {
    // If OA host is identical to ECP host, reuse ecpClient's session & cookies directly
    this.isIndependentHost = Boolean(process.env.OA_BASE_URL && process.env.OA_BASE_URL !== config.ecp.baseUrl);

    if (this.isIndependentHost) {
      this.client = axios.create({
        baseURL: config.oa.baseUrl,
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });

      this.client.interceptors.request.use((req) => {
        if (config.oa.authToken) {
          req.headers['Authorization'] = `Bearer ${config.oa.authToken}`;
        }
        return req;
      });
    }
  }

  public async post<T = any>(path: string, payload: Record<string, any> = {}): Promise<T> {
    if (!this.isIndependentHost || !this.client) {
      // Reuse ECP Client (sharing session cookie & baseUrl)
      return ecpClient.post<T>(path, payload);
    }

    try {
      const res = await this.client.post(path, payload);
      return res.data;
    } catch (err: any) {
      throw new Error(`OA API Error [${path}]: ${err.response?.data?.message || err.message}`);
    }
  }

  public async get<T = any>(path: string, params: Record<string, any> = {}): Promise<T> {
    if (!this.isIndependentHost || !this.client) {
      // Reuse ECP Client (sharing session cookie & baseUrl)
      return ecpClient.get<T>(path, params);
    }

    try {
      const res = await this.client.get(path, { params });
      return res.data;
    } catch (err: any) {
      throw new Error(`OA API Error [${path}]: ${err.response?.data?.message || err.message}`);
    }
  }
}

export const oaClient = new OaClient();
