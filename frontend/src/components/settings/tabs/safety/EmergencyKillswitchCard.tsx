import React from 'react';
import { ShieldAlert, StopCircle } from 'lucide-react';

interface EmergencyKillswitchCardProps {
  onTriggerEmergencyStop: () => void;
}

export const EmergencyKillswitchCard: React.FC<EmergencyKillswitchCardProps> = ({
  onTriggerEmergencyStop,
}) => {
  return (
    <div className="p-6 rounded-2xl bg-gradient-to-r from-rose-950/50 via-slate-900/90 to-slate-900/90 border border-rose-500/40 shadow-xl shadow-rose-950/30 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300">
          <ShieldAlert className="w-5 h-5 text-rose-400 animate-pulse" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-rose-200">Emergency Execution Freeze Kill-Switch</h3>
          <p className="text-xs text-slate-400">
            Instantly revoke all mouse/keyboard perception and kill all running agent subprocesses.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-t border-rose-500/20">
        <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
          If Seyal AI triggers unexpected loops or takes unauthorized desktop actions, press this button or tap <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-mono text-[10px] border border-slate-700">Ctrl+Alt+Escape</kbd> to immediately release OS control.
        </p>
        <button
          type="button"
          onClick={onTriggerEmergencyStop}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-rose-950/60 border border-rose-400/40 transition-all cursor-pointer shrink-0 active:scale-95"
        >
          <StopCircle className="w-4 h-4" />
          <span>TRIGGER EMERGENCY FREEZE</span>
        </button>
      </div>
    </div>
  );
};
