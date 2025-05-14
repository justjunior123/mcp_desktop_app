import { Tool } from '../types/protocol';
import axios, { AxiosInstance } from 'axios';

export interface ClientOptions {
  name: string;
  version: string;
}

export class MCPClient {
  private baseUrl: string;
  private isConnected: boolean = false;
  private http: AxiosInstance;
  private options: ClientOptions;

  constructor(serverUrl: string, options: ClientOptions) {
    this.baseUrl = serverUrl.replace(/\/+$/, ''); // Remove trailing slashes
    this.options = options;
    this.http = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `${options.name}/${options.version}`
      }
    });
  }

  public async connect(): Promise<void> {
    try {
      const response = await this.http.get('/info');
      const serverInfo = response.data;
      
      // Verify server capabilities
      if (!serverInfo.capabilities?.tools) {
        throw new Error('Server does not support tools capability');
      }

      this.isConnected = true;
    } catch (error) {
      this.isConnected = false;
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    this.isConnected = false;
  }

  public async listTools(): Promise<Tool[]> {
    if (!this.isConnected) {
      throw new Error("Client not connected");
    }
    const response = await this.http.get('/tools');
    return response.data.tools;
  }

  public async invoke(name: string, params: Record<string, unknown>): Promise<unknown> {
    if (!this.isConnected) {
      throw new Error("Client not connected");
    }
    try {
      const response = await this.http.post(`/tools/${name}`, params);
      return response.data.result;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.error || 'Unknown server error');
      }
      throw error;
    }
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  public getServerUrl(): string {
    return this.baseUrl;
  }
} 