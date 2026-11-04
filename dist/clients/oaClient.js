import axios from 'axios';
import { config } from '../config/env.js';
import { ecpClient } from './ecpClient.js';
export class OaClient {
    client = null;
    isIndependentHost;
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
    async post(path, payload = {}) {
        if (!this.isIndependentHost || !this.client) {
            // Reuse ECP Client (sharing session cookie & baseUrl)
            return ecpClient.post(path, payload);
        }
        try {
            const res = await this.client.post(path, payload);
            return res.data;
        }
        catch (err) {
            throw new Error(`OA API Error [${path}]: ${err.response?.data?.message || err.message}`);
        }
    }
    async get(path, params = {}) {
        if (!this.isIndependentHost || !this.client) {
            // Reuse ECP Client (sharing session cookie & baseUrl)
            return ecpClient.get(path, params);
        }
        try {
            const res = await this.client.get(path, { params });
            return res.data;
        }
        catch (err) {
            throw new Error(`OA API Error [${path}]: ${err.response?.data?.message || err.message}`);
        }
    }
}
export const oaClient = new OaClient();
//# sourceMappingURL=oaClient.js.map