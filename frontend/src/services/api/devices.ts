import { apiClient } from './client';
import type {
  LaptopStatusResponse,
  LaptopToolListResponse,
  ToolExecutionResponse,
  DeviceNode,
} from '../../types';

export const devicesApi = {
  // Laptop Agent & System Control
  async getLaptopStatus(): Promise<LaptopStatusResponse> {
    const { data } = await apiClient.get<LaptopStatusResponse>('/laptop/status');
    return data;
  },

  async listLaptopTools(): Promise<LaptopToolListResponse> {
    const { data } = await apiClient.get<LaptopToolListResponse>('/laptop/tools');
    return data;
  },

  async executeLaptopTool(
    toolName: string,
    parameters: Record<string, unknown> = {},
    skipConfirmation = false
  ): Promise<ToolExecutionResponse> {
    const { data } = await apiClient.post<ToolExecutionResponse>('/laptop/execute', {
      request_id: `gui_${Date.now()}`,
      tool_name: toolName,
      parameters,
      skip_confirmation: skipConfirmation,
    });
    return data;
  },

  // Unified Device Ecosystem
  async listDevices(): Promise<{ count: number; devices: DeviceNode[] }> {
    const { data } = await apiClient.get('/devices/');
    return data;
  },
};
