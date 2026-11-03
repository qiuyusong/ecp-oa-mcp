import axios, { AxiosInstance } from 'axios';
import { config } from '../config/env.js';

export class OaClient {
  private client: AxiosInstance;

  constructor() {
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

  public async post<T = any>(path: string, payload: Record<string, any> = {}): Promise<T> {
    try {
      const res = await this.client.post(path, payload);
      return res.data;
    } catch (err: any) {
      throw new Error(`OA API Error [${path}]: ${err.response?.data?.message || err.message}`);
    }
  }

  public async get<T = any>(path: string, params: Record<string, any> = {}): Promise<T> {
    try {
      const res = await this.client.get(path, { params });
      return res.data;
    } catch (err: any) {
      throw new Error(`OA API Error [${path}]: ${err.response?.data?.message || err.message}`);
    }
  }
}

export const oaClient = new OaClient();
