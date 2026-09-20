import React, { useState } from 'react';
import { Laptop, RefreshCw, ShieldCheck, Wifi } from 'lucide-react';
import { GlassCard } from '../common/GlassCard';
import { StatusBadge } from '../common/StatusBadge';
import { useNexus } from '../../context/NexusContext';

export const DevicesView: React.FC = () => {
  const { laptopStatus, refreshState } = useNexus();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshState();
    setIsRefreshing(false);
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-black text-xl text-white tracking-wider flex items-center gap-2">
            <Laptop className="w-5 h-5 text-cyan-400" />
            UNIFIED HOST WORKSTATION & HARDWARE MESH
          </h2>
          <p className="font-tech text-xs text-slate-400 uppercase tracking-widest mt-1">
            Autonomous Workstation Environment & System Telemetry
          </p>
        </div>

        <button
          type="button"
          disabled={isRefreshing}
          onClick={handleRefresh}
          className="cyber-btn text-xs px-3 py-1.5 self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          Scan Ecosystem
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Host Laptop Node */}
        <GlassCard glow corners className="p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-400/30 text-cyan-400">
              <Laptop className="w-6 h-6" />
            </div>
            <StatusBadge status="online" label="HOST CORE" size="sm" />
          </div>

          <div>
            <h3 className="font-tech font-bold text-lg text-white">
              {laptopStatus?.hostname || 'Host Laptop Node'}
            </h3>
            <p className="font-mono text-xs text-slate-400 mt-0.5">
              {laptopStatus?.os || 'Windows 11'} • {laptopStatus?.ip_address || '127.0.0.1'}
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1.5 font-mono text-xs text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-500">ID:</span>
              <span className="text-cyan-300 truncate max-w-[160px]">
                {laptopStatus?.device_id || 'host_laptop_01'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">CPU Load:</span>
              <span className="text-purple-300">{laptopStatus?.cpu_percent ?? 12}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">RAM:</span>
              <span className="text-emerald-300">{laptopStatus?.memory_percent ?? 45}%</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-tech text-emerald-400 pt-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Root Authority & Planner Host</span>
          </div>
        </GlassCard>

        {/* Display & Peripherals Node */}
        <GlassCard glow corners className="p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-400/30 text-purple-400">
              <Laptop className="w-6 h-6" />
            </div>
            <StatusBadge status="online" label="ACTIVE DISPLAY" size="sm" />
          </div>

          <div>
            <h3 className="font-tech font-bold text-lg text-white">
              Display & Audio Hardware
            </h3>
            <p className="font-mono text-xs text-slate-400 mt-0.5">
              Primary Screen & Sound Peripherals
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1.5 font-mono text-xs text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-500">Audio In:</span>
              <span className="text-cyan-300">Microphone (16kHz VAD)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Audio Out:</span>
              <span className="text-purple-300">Neural Speech Synth</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Vision Capture:</span>
              <span className="text-emerald-300">Desktop Screen (Active)</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-tech text-cyan-400 pt-1">
            <Wifi className="w-4 h-4" />
            <span>High-Speed Direct Bus Communication</span>
          </div>
        </GlassCard>

        {/* Security & OS Privileges Card */}
        <GlassCard glow corners className="p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-400/30 text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <StatusBadge status="online" label="VERIFIED" size="sm" />
          </div>

          <div>
            <h3 className="font-tech font-bold text-lg text-white">
              Autonomous Workstation Scope
            </h3>
            <p className="font-mono text-xs text-slate-400 mt-0.5">
              Windows Native Automation Engine
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1.5 font-mono text-xs text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-500">Execution Shell:</span>
              <span className="text-emerald-300">PowerShell / Win32 API</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Installed Tools:</span>
              <span className="text-cyan-300">72 System & App Tools</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Local Database:</span>
              <span className="text-purple-300">SQLite Instant Local-First</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-tech text-emerald-400 pt-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Autonomous Safe Sandboxing Active</span>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
