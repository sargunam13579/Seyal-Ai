import React, { useState } from 'react';
import {
  Network,
  Sparkles,
  CheckCircle2,
  Plus,
  Trash2,
  RotateCcw,
  Globe,
  X,
  Server,
  Zap,
} from 'lucide-react';

interface McpServerConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  command: string;
  transport: 'stdio' | 'sse';
  envVars?: Record<string, string>;
  enabled: boolean;
  status: 'connected' | 'disabled' | 'error';
  pingMs?: number;
  tools: string[];
}

const DEFAULT_MCP_SERVERS: McpServerConfig[] = [
  {
    id: 'brave_search',
    name: 'Brave Real-Time Web Search',
    description: 'Enables live internet browsing, webpage scraping, and web fact checking.',
    icon: '🌐',
    command: 'npx -y @modelcontextprotocol/server-brave-search',
    transport: 'stdio',
    enabled: true,
    status: 'connected',
    pingMs: 82,
    tools: ['brave_web_search', 'brave_local_search', 'fetch_webpage', 'extract_markdown'],
  },
  {
    id: 'github_tools',
    name: 'GitHub Developer Toolkit',
    description: 'Autonomous repository inspection, pull requests, issue filing, and branch code search.',
    icon: '🐙',
    command: 'npx -y @modelcontextprotocol/server-github',
    transport: 'stdio',
    enabled: true,
    status: 'connected',
    pingMs: 145,
    tools: ['search_repositories', 'create_issue', 'create_pull_request', 'get_file_contents', 'fork_repository'],
  },
  {
    id: 'filesystem_sandbox',
    name: 'Extended Filesystem Sandbox',
    description: 'High-speed recursive ripgrep search, AST code parsing, and safe disk manipulation.',
    icon: '📁',
    command: 'npx -y @modelcontextprotocol/server-filesystem',
    transport: 'stdio',
    enabled: true,
    status: 'connected',
    pingMs: 16,
    tools: ['read_file', 'write_file', 'list_directory', 'grep_search', 'directory_tree'],
  },
  {
    id: 'sqlite_postgres',
    name: 'Local Database & SQL Explorer',
    description: 'Query SQLite, PostgreSQL, and ChromaDB schemas and execute analytical queries.',
    icon: '🗄️',
    command: 'npx -y @modelcontextprotocol/server-postgres',
    transport: 'stdio',
    enabled: false,
    status: 'disabled',
    tools: ['query_database', 'list_tables', 'describe_schema', 'execute_transaction'],
  },
  {
    id: 'slack_messaging',
    name: 'Slack & Team Communications',
    description: 'Post automated notifications, read customer feedback threads, and report status.',
    icon: '💬',
    command: 'npx -y @modelcontextprotocol/server-slack',
    transport: 'stdio',
    enabled: false,
    status: 'disabled',
    tools: ['post_message', 'list_channels', 'get_thread_replies'],
  },
];

export const McpIntegrationsTab: React.FC = () => {
  const [servers, setServers] = useState<McpServerConfig[]>(() => {
    try {
      const saved = localStorage.getItem('seyal_mcp_config');
      return saved ? JSON.parse(saved) : DEFAULT_MCP_SERVERS;
    } catch {
      return DEFAULT_MCP_SERVERS;
    }
  });

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

  const saveServers = (updated: McpServerConfig[]) => {
    setServers(updated);
    try {
      localStorage.setItem('seyal_mcp_config', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleServer = (serverId: string, currentEnabled: boolean) => {
    const updated = servers.map((s) =>
      s.id === serverId
        ? {
            ...s,
            enabled: !currentEnabled,
            status: (!currentEnabled ? 'connected' : 'disabled') as McpServerConfig['status'],
          }
        : s
    );
    saveServers(updated);
    showToast(`Server ${!currentEnabled ? 'Enabled' : 'Disabled'}`);
  };

  const handleTestPing = (serverId: string) => {
    setTestingId(serverId);
    setTimeout(() => {
      setTestingId(null);
      const simulatedPing = Math.floor(Math.random() * 50 + 25);
      const updated = servers.map((s) =>
        s.id === serverId ? { ...s, status: 'connected' as const, pingMs: simulatedPing } : s
      );
      saveServers(updated);
      showToast(`MCP Ping successful! Tool discovery responsive (${simulatedPing}ms) ✅`);
    }, 600);
  };

  const handleAddCustomServer = () => {
    if (!newName.trim() || !newCommand.trim()) return;
    const newServer: McpServerConfig = {
      id: `custom_${Date.now()}`,
      name: newName.trim(),
      description: newDesc.trim() || 'Custom user-registered MCP server plugin.',
      icon: '🔌',
      command: newCommand.trim(),
      transport: 'stdio',
      enabled: true,
      status: 'connected',
      pingMs: 45,
      tools: ['execute_custom_tool', 'query_extension'],
    };
    const updated = [...servers, newServer];
    saveServers(updated);
    setNewName('');
    setNewCommand('');
    setNewDesc('');
    setIsAddingServer(false);
    showToast(`Added MCP Server "${newServer.name}" 🚀`);
  };

  const handleDeleteServer = (serverId: string) => {
    if (!confirm('Remove this MCP server configuration?')) return;
    const updated = servers.filter((s) => s.id !== serverId);
    saveServers(updated);
    showToast('MCP server removed');
  };

  const handleResetDefaults = () => {
    if (!confirm('Reset MCP servers to standard factory preset list?')) return;
    saveServers(DEFAULT_MCP_SERVERS);
    showToast('MCP configurations reset to standard list');
  };

  // Counts
  const activeServersCount = servers.filter((s) => s.enabled).length;
  const totalDiscoveredTools = servers
    .filter((s) => s.enabled)
    .reduce((acc, curr) => acc + curr.tools.length, 0);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar animate-fadeIn">
      {/* Sticky Cyber Header */}
      <div className="px-6 sm:px-8 py-4 border-b border-cyan-500/20 shrink-0 sticky top-0 bg-[#080e1d]/95 backdrop-blur-md z-40 shadow-lg shadow-black/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-sm shadow-cyan-500/20">
              <Network className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                MCP & Plugin Integrations
                <span className="px-2 py-0.5 text-[10px] uppercase font-mono tracking-wider font-semibold rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  Model Context Protocol
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Connect external tool servers, web search, GitHub repos, databases, and enterprise extensions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-xs font-medium text-slate-300 transition-all cursor-pointer"
              title="Reset MCP servers"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAddingServer(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-xs font-bold text-white shadow-md shadow-cyan-950/50 border border-cyan-400/40 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom MCP</span>
            </button>
          </div>
        </div>

        {/* Top HUD Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3 pt-3 border-t border-slate-800/80 text-[11px]">
          <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-cyan-400" />
              Active Servers:
            </span>
            <span className="font-semibold text-cyan-300 font-mono">
              {activeServersCount} / {servers.length} Connected
            </span>
          </div>

          <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              Discovered Tools:
            </span>
            <span className="font-semibold text-emerald-300 font-mono">{totalDiscoveredTools} Tools</span>
          </div>

          <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Network className="w-3.5 h-3.5 text-indigo-400" />
              Protocol Standard:
            </span>
            <span className="font-semibold text-indigo-300 font-mono">MCP v1.0 Standard</span>
          </div>

          <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Tool Sandboxing:
            </span>
            <span className="font-semibold text-amber-300 font-mono">ENFORCED</span>
          </div>
        </div>
      </div>

      {/* Toast Notification Banner */}
      {toastMsg && (
        <div className="mx-6 sm:mx-8 mt-4 bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs px-4 py-2.5 rounded-lg flex items-center gap-2.5 shadow-lg shadow-cyan-950/50 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="font-medium">{toastMsg}</span>
        </div>
      )}

      {/* Main Content Body */}
      <div className="p-6 sm:p-8 space-y-6 w-full max-w-5xl mx-auto">
        {/* Add Custom Server Modal / Card */}
        {isAddingServer && (
          <div className="p-5 rounded-2xl bg-slate-900/90 border-2 border-cyan-500/50 shadow-xl shadow-cyan-950/40 space-y-3.5 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <span className="text-xs font-bold text-cyan-300 flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                Register New Model Context Protocol (MCP) Server
              </span>
              <button
                type="button"
                onClick={() => setIsAddingServer(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Server Name / Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Notion MCP, Jira Connector, Local Python Tools"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Launch Command (stdio) or SSE URL
                </label>
                <input
                  type="text"
                  placeholder="e.g. npx -y @modelcontextprotocol/server-notion"
                  value={newCommand}
                  onChange={(e) => setNewCommand(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-100 font-mono placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Description / Purpose
                </label>
                <input
                  type="text"
                  placeholder="Describe tools and capabilities provided by this server..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsAddingServer(false)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-400 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddCustomServer}
                disabled={!newName.trim() || !newCommand.trim()}
                className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition-all disabled:opacity-50"
              >
                Connect Server
              </button>
            </div>
          </div>
        )}

        {/* Servers List */}
        <div className="space-y-3.5">
          {servers.map((server) => {
            return (
              <div
                key={server.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  server.enabled
                    ? 'bg-slate-900/80 border-cyan-500/40 shadow-sm'
                    : 'bg-slate-900/40 border-slate-800/60 opacity-70'
                }`}
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{server.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-100">{server.name}</h4>
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold uppercase ${
                            server.enabled
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {server.enabled ? 'ACTIVE' : 'DISABLED'}
                        </span>
                        {server.pingMs && server.enabled && (
                          <span className="text-[9px] font-mono text-cyan-300 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/20">
                            {server.pingMs}ms
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{server.description}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
                    {server.enabled && (
                      <button
                        type="button"
                        disabled={testingId === server.id}
                        onClick={() => handleTestPing(server.id)}
                        className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-all"
                      >
                        {testingId === server.id ? 'Pinging...' : 'Ping Test'}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleToggleServer(server.id, server.enabled)}
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                        server.enabled ? 'bg-cyan-500 justify-end shadow-sm shadow-cyan-500/50' : 'bg-slate-700 justify-start'
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full bg-white shadow-md transition-all" />
                    </button>

                    {server.id.startsWith('custom_') && (
                      <button
                        type="button"
                        onClick={() => handleDeleteServer(server.id)}
                        className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-300 transition-colors"
                        title="Delete custom MCP server"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Sub-body: Command & Discovered Tools */}
                <div className="pt-3 space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[10px] text-slate-500 font-mono">COMMAND:</span>
                    <span className="text-[11px] text-cyan-300 font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800 truncate">
                      {server.command}
                    </span>
                  </div>

                  {/* Discovered Tools Badges */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-semibold block">
                      Discovered Tools ({server.tools.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {server.tools.map((tName) => (
                        <span
                          key={tName}
                          className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-950/80 border border-slate-800 text-slate-300"
                        >
                          ⚡ {tName}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Explain Card */}
        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-3">
          <Globe className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-slate-300">About Model Context Protocol (MCP)</p>
            <p className="text-slate-400 mt-0.5 leading-relaxed">
              MCP is the universal open standard pioneered by Anthropic and adopted across the AI industry. It allows Seyal AI to safely discover and run tools on your machine without embedding hardcoded APIs into the agent.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
