import { apiClient } from './client';
import type { HealthResponse } from '../../types';

export const systemApi = {
  // System Health & Liveness
  async getHealth(): Promise<HealthResponse> {
    const { data } = await apiClient.get<HealthResponse>('/health', { timeout: 3000 });
    return data;
  },

  async getReady(): Promise<{ status: string; subsystems: Record<string, any> }> {
    const { data } = await apiClient.get('/ready', { timeout: 5000 });
    return data;
  },

  // Laptop Awareness & Telemetry
  async getLaptopAwareness(): Promise<any> {
    const { data } = await apiClient.get('/system/awareness');
    return data?.data || data;
  },

  async scanLaptopAwareness(): Promise<any> {
    const { data } = await apiClient.post('/system/awareness/scan');
    return data?.data || data;
  },

  async getLiveTelemetry(): Promise<any> {
    const { data } = await apiClient.get('/system/awareness/live');
    return data?.data || data;
  },

  async getActiveWindow(): Promise<any> {
    const { data } = await apiClient.get('/system/awareness/active-window');
    return data?.data || data;
  },

  // Storage & Maintenance Endpoints
  async getStorageStats(): Promise<{
    storagePath: string;
    visionSize: number;
    vectorSize: number;
    audioSize: number;
    logsSize: number;
    totalUsedMb: number;
    reclaimableMb: number;
  }> {
    const { data } = await apiClient.get('/system/storage/stats');
    return data;
  },

  async cleanStorage(type: 'vision' | 'audio' | 'logs' | 'vacuum' | 'all'): Promise<{
    success: boolean;
    freedMb: number;
    vacuumed: boolean;
    target: string;
  }> {
    const { data } = await apiClient.post('/system/storage/clean', { type });
    return data;
  },

  async purgeConversations(): Promise<{ success: boolean; message: string }> {
    const { data } = await apiClient.post('/system/data/purge-conversations');
    return data;
  },

  async wipeUserKnowledge(): Promise<{ success: boolean; message: string }> {
    const { data } = await apiClient.post('/system/data/wipe-knowledge');
    return data;
  },

  async factoryReset(): Promise<{ success: boolean; message: string }> {
    const { data } = await apiClient.post('/system/data/factory-reset', { confirm_nuclear: true });
    return data;
  },
};
