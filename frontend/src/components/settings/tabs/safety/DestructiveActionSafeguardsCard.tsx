import React from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import type { SafetySettings } from './types';

interface DestructiveActionSafeguardsCardProps {
  safetySettings: SafetySettings;
  updateSafetySetting: <K extends keyof SafetySettings>(key: K, val: SafetySettings[K]) => void;
  renderToggle: (checked: boolean, onChange: (val: boolean) => void) => React.ReactNode;
}

export const DestructiveActionSafeguardsCard: React.FC<DestructiveActionSafeguardsCardProps> = ({
  safetySettings,
  updateSafetySetting,
  renderToggle,
}) => {
  return (
    <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Destructive Action Protections</h3>
            <p className="text-[11px] text-slate-400">
              Enforce operator confirmation before executing potentially harmful OS modifications
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {/* Confirm File Deletions */}
        <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-200">
              Confirm File & Directory Deletions
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Require explicit operator consent before the agent permanently deletes or overwrites any file system item.
            </p>
          </div>
          {renderToggle(safetySettings.requireConfirmDelete, (val) =>
            updateSafetySetting('requireConfirmDelete', val)
          )}
        </div>

        {/* Confirm High-Risk Shell Commands */}
        <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-200">
              Confirm High-Risk Terminal & Shell Commands
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Intercept critical commands (e.g. format, registry edits, diskpart, process kill, rm -rf, drop database).
            </p>
          </div>
          {renderToggle(safetySettings.requireConfirmTerminal, (val) =>
            updateSafetySetting('requireConfirmTerminal', val)
          )}
        </div>

        {/* Prevent Self-Termination */}
        <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-200">
              Prevent Watchdog & Self-Termination
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Block the autonomous agent from terminating its own parent process, background daemons, or watchdog service.
            </p>
          </div>
          {renderToggle(safetySettings.preventSelfKill, (val) =>
            updateSafetySetting('preventSelfKill', val)
          )}
        </div>

        {/* Confirmation Timeout Duration Slider */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              Operator Confirmation Auto-Timeout
            </span>
            <span className="font-mono text-cyan-300 font-bold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
              {safetySettings.confirmationTimeoutSec}s (Auto-Deny)
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            If the agent requests permission and no operator answers within this duration, the request will safely auto-deny.
          </p>
          <div className="flex items-center gap-3 pt-1">
            <span className="text-[10px] text-slate-500">10s</span>
            <input
              type="range"
              min="10"
              max="120"
              step="5"
              value={safetySettings.confirmationTimeoutSec}
              onChange={(e) => updateSafetySetting('confirmationTimeoutSec', parseInt(e.target.value, 10))}
              className="flex-1 h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <span className="text-[10px] text-slate-500">120s</span>
          </div>
        </div>
      </div>
    </div>
  );
};
