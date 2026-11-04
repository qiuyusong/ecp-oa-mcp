import axios from 'axios';
import { config } from '../config/env.js';
export function actionPath(action, query = {}) {
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
export function assertEcpSuccess(path, data) {
    if (data?._header_?.success === false) {
        const header = data._header_;
        throw new Error(`ECP Action Error [${path}]: ${header.errorMessage || header.message || header.errorCode || 'request failed'}`);
    }
    return data;
}
export class EcpClient {
    client;
    tokenId = config.ecp.authToken || null;
    onlineUserId = config.user.userId || null;
    loginPromise = null;
    constructor(options = {}) {
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
    options;
    async login() {
        if (this.tokenId)
            return true;
        if (!this.options.username || !this.options.password)
            return false;
        if (!this.loginPromise) {
            this.loginPromise = this.applyAccountToken().finally(() => {
                this.loginPromise = null;
            });
        }
        return this.loginPromise;
    }
    async applyAccountToken() {
        const path = '/openapi/aile/token/apply';
        try {
            const res = await this.client.post(path, {
                loginType: 'account',
                loginName: this.options.username,
                password: this.options.password,
                language: 'zh-tw',
            });
            const data = assertEcpSuccess(path, res.data);
            if (!data.tokenId)
                throw new Error('ECP login succeeded without tokenId');
            this.tokenId = data.tokenId;
            this.onlineUserId = data.user?.id || data.employee?.id || this.onlineUserId;
            return true;
        }
        catch (err) {
            throw new Error(`ECP login failed: ${err.response?.data?._header_?.errorMessage || err.message || err}`);
        }
    }
    async getUserId() {
        if (!this.onlineUserId) {
            await this.login();
        }
        if (!this.onlineUserId) {
            throw new Error('ECP user ID is unavailable; configure valid ECP credentials or USER_ID.');
        }
        return this.onlineUserId;
    }
    async postAction(action, payload = {}) {
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
            return assertEcpSuccess(path, res.data);
        }
        catch (err) {
            if (err.message?.startsWith(`ECP Action Error [${path}]:`))
                throw err;
            const detail = err.response?.data?._header_?.errorMessage
                || err.response?.data?._header_?.message
                || err.response?.data?.message
                || err.message;
            throw new Error(`ECP Action Error [${path}]: ${detail}`);
        }
    }
    async post(path, payload = {}) {
        await this.login();
        try {
            const body = this.tokenId && path.startsWith('/openapi/')
                ? { ...payload, _header_: { ...(payload._header_ || {}), tokenId: this.tokenId } }
                : payload;
            const res = await this.client.post(path, body);
            return assertEcpSuccess(path, res.data);
        }
        catch (err) {
            throw new Error(`ECP API Error [${path}]: ${err.response?.data?._header_?.errorMessage || err.response?.data?.message || err.message}`);
        }
    }
    async get(path, params = {}) {
        await this.login();
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