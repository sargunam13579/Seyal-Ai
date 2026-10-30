import React from 'react';
import { Network, Sparkles, CheckCircle2, Plus, RotateCcw, Server, Zap } from 'lucide-react';
import type { McpServerConfig } from './types';

interface McpHeaderHUDProps {
  servers: McpServerConfig[];
  toastMsg: string | null;
  onResetDefaults: () => void;
  onOpenAddModal: () => void;
}

export const McpHeaderHUD: React.FC<McpHeaderHUDProps> = ({
  servers,
  toastMsg,
  onResetDefaults,
  onOpenAddModal,
}) => {
  const activeServersCount = servers.filter((s) => s.enabled).length;
  const totalDiscoveredTools = servers
    .filter((s) => s.enabled)
    .reduce((acc, curr) => acc + curr.tools.length, 0);

  return (
    <>
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
              onClick={onResetDefaults}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-xs font-medium text-slate-300 transition-all cursor-pointer"
              title="Reset MCP servers"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset</span>
            </button>
            <button
              type="button"
              onClick={onOpenAddModal}
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
    </>
  );
};
