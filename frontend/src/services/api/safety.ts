import { apiClient } from './client';

export const safetyApi = {
  // Permissions Guardrails
  async getPermissions(): Promise<
    Record<
      string,
      {
        scope: string;
        granted: boolean;
        mode?: 'allow' | 'ask' | 'block';
        last_accessed_at?: number | null;
        last_accessed_by?: string | null;
        description: string;
      }
    >
  > {
    const { data } = await apiClient.get('/permissions');
    return data?.scopes || {};
  },

  async setPermissionMode(scope: string, mode: 'allow' | 'ask' | 'block'): Promise<any> {
    const { data } = await apiClient.post('/permissions/mode', { scope, mode });
    return data;
  },

  async grantPermission(scope: string): Promise<any> {
    const { data } = await apiClient.post('/permissions/grant', { scope });
    return data;
  },

  async revokePermission(scope: string): Promise<any> {
    const { data } = await apiClient.post('/permissions/revoke', { scope });
    return data;
  },

  async resetPermissions(): Promise<any> {
    const { data } = await apiClient.post('/permissions/reset');
    return data;
  },

  // Agent Planning & Task Management
  async listTasks(): Promise<{ count: number; tasks: any[] }> {
    const { data } = await apiClient.get('/tasks');
    return data || { count: 0, tasks: [] };
  },

  async getTaskDetails(taskId: string): Promise<any> {
    const { data } = await apiClient.get(`/tasks/${taskId}`);
    return data;
  },

  async cancelTask(taskId: string, reason: string = 'User requested cancellation'): Promise<any> {
    const { data } = await apiClient.post(`/tasks/${taskId}/cancel`, { reason });
    return data;
  },

  async emergencyStopTasks(reason: string = 'EMERGENCY STOP triggered via Task Manager UI'): Promise<any> {
    const { data } = await apiClient.post('/tasks/emergency/stop', { reason });
    return data;
  },

  async updateTaskPermission(taskId: string, action: 'grant' | 'deny'): Promise<any> {
    const { data } = await apiClient.post(`/tasks/${taskId}/permission`, { action });
    return data;
  },

  async classifyTask(instruction: string): Promise<any> {
    const { data } = await apiClient.post('/tasks/classify', { instruction });
    return data;
  },

  // Safety Guardrails Endpoints
  async getSafetySettings(): Promise<{
    profile: 'zero_trust' | 'balanced' | 'developer';
    requireConfirmDelete: boolean;
    requireConfirmTerminal: boolean;
    blockPaymentGateways: boolean;
    preventSelfKill: boolean;
    credentialProtection: boolean;
    maskApiKeys: boolean;
    maskCreditCards: boolean;
    maskPasswords: boolean;
    confirmationTimeoutSec: number;
    blacklistPaths: string[];
    safeWorkspaces: string[];
    blockedApplications: string[];
  }> {
    const { data } = await apiClient.get('/safety');
    return data;
  },

  async updateSafetySettings(settings: {
    profile: 'zero_trust' | 'balanced' | 'developer';
    requireConfirmDelete: boolean;
    requireConfirmTerminal: boolean;
    blockPaymentGateways: boolean;
    preventSelfKill: boolean;
    credentialProtection: boolean;
    maskApiKeys: boolean;
    maskCreditCards: boolean;
    maskPasswords: boolean;
    confirmationTimeoutSec: number;
    blacklistPaths: string[];
    safeWorkspaces: string[];
    blockedApplications: string[];
  }): Promise<any> {
    const { data } = await apiClient.put('/safety', settings);
    return data;
  },
};
