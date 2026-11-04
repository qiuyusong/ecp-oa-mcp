import axios from 'axios';
import { config } from '../config/env.js';
export class EcpClient {
    client;
    sessionCookie = null;
    onlineUserId = config.user.userId || null;
    constructor() {
        this.client = axios.create({
            baseURL: config.ecp.baseUrl,
            timeout: 15000,
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
        });
        this.client.interceptors.request.use((req) => {
            if (this.sessionCookie) {
                req.headers['Cookie'] = this.sessionCookie;
            }
            if (config.ecp.authToken) {
                req.headers['Authorization'] = `Bearer ${config.ecp.authToken}`;
            }
            if (config.ecp.tenantId) {
                req.headers['X-Tenant-Id'] = config.ecp.tenantId;
            }
            return req;
        });
        this.client.interceptors.response.use((res) => {
            const setCookies = res.headers['set-cookie'];
            if (setCookies && Array.isArray(setCookies) && setCookies.length > 0) {
                this.sessionCookie = setCookies.map((c) => c.split(';')[0]).join('; ');
            }
            return res;
        });
    }
    async login() {
        if (config.ecp.authToken) {
            return true;
        }
        if (!config.ecp.username || !config.ecp.password) {
            return false;
        }
        try {
            const res = await this.client.post('/login', {
                username: config.ecp.username,
                password: config.ecp.password,
            });
            if (res.data && (res.data.status === 'ok' || res.data.success || res.status === 200)) {
                await this.resolveOnlineUserId();
                return true;
            }
            return false;
        }
        catch (err) {
            console.warn(`[ECP Login] Notice: ${err.message || err}`);
            return false;
        }
    }
    async getUserId() {
        if (this.onlineUserId)
            return this.onlineUserId;
        await this.resolveOnlineUserId();
        return this.onlineUserId || '00000000-0000-0000-0000-000000000001';
    }
    async resolveOnlineUserId() {
        try {
            const res = await this.client.post('/openapi/user/current', {});
            if (res.data?.data?.userId) {
                this.onlineUserId = res.data.data.userId;
                return this.onlineUserId;
            }
        }
        catch {
            // Fallback or offline mock
        }
        return this.onlineUserId;
    }
    // Generic POST caller for ECP API
    async post(path, payload = {}) {
        try {
            const res = await this.client.post(path, payload);
            return res.data;
        }
        catch (err) {
            throw new Error(`ECP API Error [${path}]: ${err.response?.data?.message || err.message}`);
        }
    }
    // Generic GET caller for ECP API
    async get(path, params = {}) {
        try {
            const res = await this.client.get(path, { params });
            return res.data;
        }
        catch (err) {
            throw new Error(`ECP API Error [${path}]: ${err.response?.data?.message || err.message}`);
        }
    }
}
export const ecpClient = new EcpClient();
//# sourceMappingURL=ecpClient.js.map