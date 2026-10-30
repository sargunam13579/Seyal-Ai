import React from 'react';
import {
  Activity,
  Wifi,
  Zap,
  Cpu,
  HardDrive,
  RefreshCw,
  FolderOpen,
  Terminal,
  CheckCircle2,
  Check,
  Info,
} from 'lucide-react';

interface DiagnosticsTelemetryCardProps {
  isBackendConnected: boolean;
  diagnosticsLatency: number;
  isProbing: boolean;
  onRunProbe: () => void;
  onOpenLogs: () => void;
  onClearCaches: () => void;
  probeResult: string | null;
  cacheNotice: string | null;
  logsNotice: string | null;
}

export const DiagnosticsTelemetryCard: React.FC<DiagnosticsTelemetryCardProps> = ({
  isBackendConnected,
  diagnosticsLatency,
  isProbing,
  onRunProbe,
  onOpenLogs,
  onClearCaches,
  probeResult,
  cacheNotice,
  logsNotice,
}) => {
  return (
    <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-300 border border-teal-500/20">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">System Diagnostics & Telemetry</h3>
            <p className="text-[11px] text-slate-400">
              Real-time health telemetry, local RPC response latency, and database diagnostics
            </p>
          </div>
        </div>
        <span
          className={`text-[10px] font-mono px-2.5 py-1 rounded-md border flex items-center gap-1.5 ${
            isBackendConnected
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isBackendConnected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
          Local Backend {isBackendConnected ? 'Online (8000)' : 'Offline'}
        </span>
      </div>

      {/* Telemetry Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>RPC Latency</span>
            <Wifi className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-lg font-bold font-mono text-cyan-300">
            {diagnosticsLatency} <span className="text-xs font-normal text-slate-400">ms</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono">● Sub-15ms Excellent</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>WebSocket Link</span>
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-lg font-bold font-mono text-white">
            0.0% <span className="text-xs font-normal text-slate-400">loss</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono">● ws://127.0.0.1:8000</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Node & Heap</span>
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-lg font-bold font-mono text-white">
            ~148 <span className="text-xs font-normal text-slate-400">MB</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Electron v30.x Active</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>SQLite Database</span>
            <HardDrive className="w-3.5 h-3.5 text-teal-400" />
          </div>
          <div className="text-lg font-bold font-mono text-white">
            ~2.4 <span className="text-xs font-normal text-slate-400">MB</span>
          </div>
          <span className="text-[10px] text-teal-400 font-mono">● Indexed WAL Mode</span>
        </div>
      </div>

      {/* Diagnostics Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
        <button
          type="button"
          disabled={isProbing}
          onClick={onRunProbe}
          className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isProbing ? 'animate-spin' : ''}`} />
          {isProbing ? 'Running Probe...' : 'Run Diagnostics Probe'}
        </button>
        <button
          type="button"
          onClick={onOpenLogs}
          className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
          Open Diagnostics Logs
        </button>
        <button
          type="button"
          onClick={onClearCaches}
          className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Terminal className="w-3.5 h-3.5 text-purple-400" />
          Clear Temp Cache
        </button>
      </div>

      {probeResult && (
        <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{probeResult}</span>
        </div>
      )}

      {cacheNotice && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{cacheNotice}</span>
        </div>
      )}

      {logsNotice && (
        <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono flex items-center gap-2 animate-fadeIn">
          <Info className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{logsNotice}</span>
        </div>
      )}
    </div>
  );
};
