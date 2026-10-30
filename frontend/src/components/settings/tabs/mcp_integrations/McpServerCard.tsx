import React from 'react';
import { Trash2 } from 'lucide-react';
import type { McpServerConfig } from './types';

interface McpServerCardProps {
  server: McpServerConfig;
  isTesting: boolean;
  onTestPing: (id: string) => void;
  onToggleServer: (id: string, currentEnabled: boolean) => void;
  onDeleteServer: (id: string) => void;
}

export const McpServerCard: React.FC<McpServerCardProps> = ({
  server,
  isTesting,
  onTestPing,
  onToggleServer,
  onDeleteServer,
}) => {
  return (
    <div
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
              disabled={isTesting}
              onClick={() => onTestPing(server.id)}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-all"
            >
              {isTesting ? 'Pinging...' : 'Ping Test'}
            </button>
          )}

          <button
            type="button"
            onClick={() => onToggleServer(server.id, server.enabled)}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
              server.enabled ? 'bg-cyan-500 justify-end shadow-sm shadow-cyan-500/50' : 'bg-slate-700 justify-start'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white shadow-md transition-all" />
          </button>

          {server.id.startsWith('custom_') && (
            <button
              type="button"
              onClick={() => onDeleteServer(server.id)}
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
};
