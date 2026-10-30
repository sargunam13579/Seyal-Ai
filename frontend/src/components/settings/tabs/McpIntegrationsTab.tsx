import React, { useState, useEffect } from 'react';
import { api } from '../../../services/api';
import type { McpServerConfig } from './mcp_integrations';
import {
  DEFAULT_MCP_SERVERS,
  McpHeaderHUD,
  AddCustomServerModal,
  McpServerCard,
  McpAboutCard,
} from './mcp_integrations';

export const McpIntegrationsTab: React.FC = () => {
  const [servers, setServers] = useState<McpServerConfig[]>(DEFAULT_MCP_SERVERS);
  const [isAddingServer, setIsAddingServer] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCommand, setNewCommand] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [testingId, setTestingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const fetchServers = async () => {
    try {
      const data = await api.getMcpServers();
      if (Array.isArray(data) && data.length > 0) {
        setServers(
          data.map((s: any) => ({
            ...s,
            pingMs: s.ping_ms || s.pingMs || 0,
          }))
        );
      }
    } catch (e) {
      console.warn('Failed to fetch MCP servers from backend, using defaults:', e);
    }
  };

  useEffect(() => {
    fetchServers();
  }, []);

  const handleToggleServer = async (serverId: string, currentEnabled: boolean) => {
    const nextState = !currentEnabled;
    try {
      const updated = await api.toggleMcpServer(serverId, nextState);
      if (updated) {
        setServers((prev) =>
          prev.map((s) =>
            s.id === serverId
              ? { ...s, enabled: nextState, status: updated.status, pingMs: updated.ping_ms || 0, tools: updated.tools || s.tools }
              : s
          )
        );
      }
      showToast(`Server ${nextState ? 'Enabled' : 'Disabled'}`);
    } catch (err: any) {
      showToast(`Failed to toggle server: ${err?.message || err}`);
    }
  };

  const handleTestPing = async (serverId: string) => {
    setTestingId(serverId);
    try {
      const res = await api.pingMcpServer(serverId);
      if (res && res.success) {
        setServers((prev) =>
          prev.map((s) =>
            s.id === serverId ? { ...s, status: 'connected', pingMs: res.ping_ms } : s
          )
        );
        showToast(`MCP Ping successful! Server responsive (${res.ping_ms}ms) ✅`);
      } else {
        showToast(`MCP server offline or connection timed out.`);
      }
    } catch (err: any) {
      showToast(`Ping failed: ${err?.message || err}`);
    } finally {
      setTestingId(null);
    }
  };

  const handleAddCustomServer = async () => {
    if (!newName.trim() || !newCommand.trim()) return;
    const newServer: any = {
      id: `custom_${Date.now()}`,
      name: newName.trim(),
      description: newDesc.trim() || 'Custom user-registered MCP server plugin.',
      icon: '🔌',
      command: newCommand.trim(),
      transport: 'stdio',
      enabled: true,
      status: 'disconnected',
      tools: [],
    };
    try {
      await api.saveMcpServer(newServer);
      setServers((prev) => [...prev, newServer]);
      setNewName('');
      setNewCommand('');
      setNewDesc('');
      setIsAddingServer(false);
      showToast(`Added MCP Server "${newServer.name}" 🚀`);
    } catch (err: any) {
      showToast(`Failed to save server: ${err?.message || err}`);
    }
  };

  const handleDeleteServer = (serverId: string) => {
    if (!confirm('Remove this MCP server configuration?')) return;
    const updated = servers.filter((s) => s.id !== serverId);
    setServers(updated);
    showToast('MCP server removed');
  };

  const handleResetDefaults = () => {
    if (!confirm('Reset MCP servers to standard factory preset list?')) return;
    setServers(DEFAULT_MCP_SERVERS);
    showToast('MCP configurations reset to standard list');
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar animate-fadeIn">
      <McpHeaderHUD
        servers={servers}
        toastMsg={toastMsg}
        onResetDefaults={handleResetDefaults}
        onOpenAddModal={() => setIsAddingServer(true)}
      />

      {/* Main Content Body */}
      <div className="p-6 sm:p-8 space-y-6 w-full max-w-5xl mx-auto">
        <AddCustomServerModal
          isOpen={isAddingServer}
          newName={newName}
          newCommand={newCommand}
          newDesc={newDesc}
          onNameChange={setNewName}
          onCommandChange={setNewCommand}
          onDescChange={setNewDesc}
          onClose={() => setIsAddingServer(false)}
          onSubmit={handleAddCustomServer}
        />

        <div className="space-y-3.5">
          {servers.map((server) => (
            <McpServerCard
              key={server.id}
              server={server}
              isTesting={testingId === server.id}
              onTestPing={handleTestPing}
              onToggleServer={handleToggleServer}
              onDeleteServer={handleDeleteServer}
            />
          ))}
        </div>

        <McpAboutCard />
      </div>
    </div>
  );
};
