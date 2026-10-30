import React from 'react';
import { Cpu } from 'lucide-react';

export const ComputeTelemetryCard: React.FC = () => {
  return (
    <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Workstation Monthly Compute Telemetry</h3>
            <p className="text-[11px] text-slate-400">Real-time local compute consumption under your unrestricted Pro tier</p>
          </div>
        </div>
        <span className="text-[11px] font-mono font-bold text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          ZERO THROTTLING
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Metric 1 */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
          <div className="text-[11px] text-slate-400 font-medium">Autonomous Tasks Run</div>
          <div className="text-xl font-bold font-mono text-cyan-300">148 Tasks</div>
          <div className="text-[10px] text-emerald-400 font-mono">Quota: Unlimited</div>
        </div>

        {/* Metric 2 */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
          <div className="text-[11px] text-slate-400 font-medium">Vision & Screen Frames</div>
          <div className="text-xl font-bold font-mono text-amber-300">1,420 Frames</div>
          <div className="text-[10px] text-emerald-400 font-mono">Quota: High-Res Uncapped</div>
        </div>

        {/* Metric 3 */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
          <div className="text-[11px] text-slate-400 font-medium">Neural Voice Synthesis</div>
          <div className="text-xl font-bold font-mono text-indigo-300">38,500 Words</div>
          <div className="text-[10px] text-emerald-400 font-mono">Quota: Unlimited Streaming</div>
        </div>
      </div>
    </div>
  );
};
