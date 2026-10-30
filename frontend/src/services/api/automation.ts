import { apiClient } from './client';

export const automationApi = {
  // Automation Routines Endpoints
  async getAutomationRoutines(): Promise<any[]> {
    const { data } = await apiClient.get('/automation/routines');
    return data?.routines || [];
  },

  async runAutomationRoutine(routineId: string): Promise<any> {
    const { data } = await apiClient.post(`/automation/routines/${encodeURIComponent(routineId)}/run`);
    return data;
  },

  async toggleAutomationRoutine(routineId: string, enabled: boolean): Promise<any> {
    const { data } = await apiClient.post(`/automation/routines/${encodeURIComponent(routineId)}/toggle`, { enabled });
    return data;
  },
};
