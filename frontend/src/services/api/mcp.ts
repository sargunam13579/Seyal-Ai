import { apiClient } from './client';

export const mcpApi = {
  // Model Context Protocol (MCP) Endpoints
  async getMcpServers(): Promise<any[]> {
    const { data } = await apiClient.get('/mcp/servers');
    return data?.servers || [];
  },

  async toggleMcpServer(serverId: string, enabled: boolean): Promise<any> {
    const { data } = await apiClient.post(`/mcp/servers/${encodeURIComponent(serverId)}/toggle`, { enabled });
    return data?.server;
  },

  async pingMcpServer(serverId: string): Promise<{ success: boolean; ping_ms: number }> {
    const { data } = await apiClient.post(`/mcp/servers/${encodeURIComponent(serverId)}/ping`);
    return data;
  },

  async saveMcpServer(config: any): Promise<any> {
    const { data } = await apiClient.post('/mcp/servers', config);
    return data?.server;
  },
};
