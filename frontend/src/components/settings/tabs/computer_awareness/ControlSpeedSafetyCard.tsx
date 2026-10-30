import React from 'react';
import {
  Gauge,
  MousePointer,
  Keyboard,
  PauseCircle,
  Plus,
  Trash2,
} from 'lucide-react';
import type { ComputerControlConfig } from './types';

interface ControlSpeedSafetyCardProps {
  controlConfig: ComputerControlConfig;
  updateControlConfig: <K extends keyof ComputerControlConfig>(
    key: K,
    val: ComputerControlConfig[K]
  ) => void;
  newBlacklistApp: string;
  setNewBlacklistApp: (val: string) => void;
  onAddBlacklistApp: () => void;
  onRemoveBlacklistApp: (app: string) => void;
  renderToggle: (checked: boolean, onChange: (val: boolean) => void) => React.ReactNode;
}

export const ControlSpeedSafetyCard: React.FC<ControlSpeedSafetyCardProps> = ({
  controlConfig,
  updateControlConfig,
  newBlacklistApp,
  setNewBlacklistApp,
  onAddBlacklistApp,
  onRemoveBlacklistApp,
  renderToggle,
}) => {
  return (
    <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-5">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            <Gauge className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Execution Speed & Operator Takeover Guards</h3>
            <p className="text-[11px] text-slate-400">
              Fine-tune cursor physics, keystroke delays, and automatic safety pause on physical mouse takeover
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cursor Glide Speed */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
          <div className="text-xs font-semibold text-slate-200 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <MousePointer className="w-3.5 h-3.5 text-cyan-400" />
              Mouse Movement Motion
            </span>
            <span className="text-[10px] text-cyan-400 font-mono uppercase">{controlConfig.cursorGlideSpeed}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'natural', label: 'Natural Curve', desc: 'Curved human-like trajectory' },
              { id: 'smooth', label: 'Smooth Linear', desc: 'Direct smooth sweep' },
              { id: 'instant', label: 'Instant Jump', desc: 'Sub-millisecond snap' },
            ].map((speed) => (
              <button
                key={speed.id}
                type="button"
                onClick={() => updateControlConfig('cursorGlideSpeed', speed.id as any)}
                className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                  controlConfig.cursorGlideSpeed === speed.id
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="text-xs font-bold">{speed.label}</div>
                <div className="text-[9px] text-slate-500 mt-0.5">{speed.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Keystroke Delay Slider */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
          <div className="text-xs font-semibold text-slate-200 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Keyboard className="w-3.5 h-3.5 text-blue-400" />
              Keystroke Delay (Typing Cadence)
            </span>
            <span className="text-[10px] text-cyan-400 font-mono">{controlConfig.keystrokeDelayMs} ms / key</span>
          </div>
          <input
            type="range"
            min="5"
            max="120"
            step="5"
            value={controlConfig.keystrokeDelayMs}
            onChange={(e) => updateControlConfig('keystrokeDelayMs', parseInt(e.target.value, 10))}
            className="w-full accent-cyan-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>Fast (5ms)</span>
            <span>Balanced (35ms)</span>
            <span>Human (120ms)</span>
          </div>
        </div>

        {/* Physical Takeover Safety Pause */}
        <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 md:col-span-2">
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <PauseCircle className="w-3.5 h-3.5 text-rose-400" />
              Physical Mouse Takeover Auto-Pause (Anti-Collision Guard)
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              When you move your real physical mouse, immediately pause autonomous AI movement to prevent fighting for the cursor.
            </p>
          </div>
          {renderToggle(controlConfig.autoPauseOnUserMouseMove, (val) =>
            updateControlConfig('autoPauseOnUserMouseMove', val)
          )}
        </div>
      </div>

      {/* Blacklisted App Windows */}
      <div className="space-y-2 pt-2 border-t border-slate-800/80">
        <label className="block text-xs font-semibold text-slate-200">
          Protected / Blacklisted Windows (Never Automate Or Capture)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newBlacklistApp}
            onChange={(e) => setNewBlacklistApp(e.target.value)}
            placeholder="App or window title (e.g. 1Password, WhatsApp, Outlook)..."
            className="flex-1 bg-slate-950 border border-slate-700 focus:border-cyan-500/60 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none"
            onKeyDown={(e) => e.key === 'Enter' && onAddBlacklistApp()}
          />
          <button
            type="button"
            onClick={onAddBlacklistApp}
            disabled={!newBlacklistApp.trim()}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1 cursor-pointer disabled:opacity-40"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Blacklist</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-1">
          {controlConfig.blacklistedApps.map((app) => (
            <span
              key={app}
              className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center gap-1.5"
            >
              <span>{app}</span>
              <button
                type="button"
                onClick={() => onRemoveBlacklistApp(app)}
                className="hover:text-rose-100 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
