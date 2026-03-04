import axios, { type AxiosInstance } from 'axios';
import { getConfig } from '../config.js';
import { logger } from '../utils/logger.js';

export class ApiGatewayClient {
  private static _instance: ApiGatewayClient | null = null;

  static getInstance(): ApiGatewayClient {
    if (!ApiGatewayClient._instance) {
      ApiGatewayClient._instance = new ApiGatewayClient();
    }

    return ApiGatewayClient._instance;
  }

  private _client: AxiosInstance;

  constructor() {
    const { apiGateway } = getConfig();

    this._client = axios.create({
      baseURL: apiGateway.baseUrl,
      headers: {
        Authorization: `Bearer ${apiGateway.token}`,
      },
    });

    logger.info({
      msg: '🌐 API Gateway client initialized',
      config: { baseUrl: apiGateway.baseUrl },
    });
  }

  async get<T>(url: string, params?: Record<string, string>): Promise<T> {
    const { data } = await this._client.get<T>(url, { params });
    return data;
  }

  async post<T>(url: string, body: Record<string, unknown>): Promise<T> {
    const { data } = await this._client.post<T>(url, body);
    return data;
  }

  async postForm<T>(url: string, formData: Record<string, string>): Promise<T> {
    const params = new URLSearchParams(formData);
    const { data } = await this._client.post<T>(url, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return data;
  }
}
