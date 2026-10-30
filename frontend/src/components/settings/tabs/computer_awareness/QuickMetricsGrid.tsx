import React from 'react';
import { Layers, Activity, Monitor, Cpu, Battery } from 'lucide-react';

interface QuickMetricsGridProps {
  awarenessData: any;
}

export const QuickMetricsGrid: React.FC<QuickMetricsGridProps> = ({ awarenessData }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 shadow-sm flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
          <Layers className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[11px] text-slate-400">Installed Apps</div>
          <div className="text-lg font-bold text-white font-mono">
            {awarenessData?.installed_apps_count || 0}
          </div>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 shadow-sm flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
          <Activity className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[11px] text-slate-400">Running Apps</div>
          <div className="text-lg font-bold text-white font-mono">
            {awarenessData?.running_apps_count || 0}
          </div>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 shadow-sm flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
          <Monitor className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[11px] text-slate-400">Open Windows</div>
          <div className="text-lg font-bold text-white font-mono">
            {awarenessData?.open_windows_count || 0}
          </div>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 shadow-sm flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
          <Cpu className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[11px] text-slate-400">RAM Usage</div>
          <div className="text-lg font-bold text-white font-mono">
            {awarenessData?.system_info?.ram?.used_percent || 0}%
          </div>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 shadow-sm flex items-center gap-3 col-span-2 sm:col-span-1">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
          <Battery className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[11px] text-slate-400">Battery / Power</div>
          <div className="text-sm font-bold text-white font-mono truncate">
            {awarenessData?.system_info?.battery
              ? `${awarenessData.system_info.battery.percent}% ${
                  awarenessData.system_info.battery.power_plugged ? '⚡ AC' : '🔋 Batt'
                }`
              : '⚡ AC Power'}
          </div>
        </div>
      </div>
    </div>
  );
};
