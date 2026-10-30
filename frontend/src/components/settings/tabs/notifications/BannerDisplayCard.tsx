import React from 'react';
import { Layers } from 'lucide-react';
import type { NotificationSettings } from './types';

interface BannerDisplayCardProps {
  notifSettings: NotificationSettings;
  updateNotifSetting: <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) => void;
}

export const BannerDisplayCard: React.FC<BannerDisplayCardProps> = ({
  notifSettings,
  updateNotifSetting,
}) => {
  return (
    <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Banner Position & Display Cadence</h3>
            <p className="text-[11px] text-slate-400">Desktop popup location and auto-dismiss timer</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Position */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
          <label className="block text-xs font-semibold text-slate-200">
            Toast Popup Position
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'top-right', label: 'Top-Right' },
              { id: 'bottom-right', label: 'Bottom-Right' },
              { id: 'top-center', label: 'Top-Center' },
            ].map((pos) => (
              <button
                key={pos.id}
                type="button"
                onClick={() => updateNotifSetting('bannerPosition', pos.id as any)}
                className={`py-2 px-2.5 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                  notifSettings.bannerPosition === pos.id
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {pos.label}
              </button>
            ))}
          </div>
        </div>

        {/* Auto-Dismiss Duration */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
            <span>Auto-Dismiss Duration</span>
            <span className="font-mono text-cyan-400">{notifSettings.toastDurationSeconds} seconds</span>
          </div>
          <input
            type="range"
            min="3"
            max="12"
            step="1"
            value={notifSettings.toastDurationSeconds}
            onChange={(e) => updateNotifSetting('toastDurationSeconds', Number(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg mt-2"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>Fast (3s)</span>
            <span>Default (5s)</span>
            <span>Persistent (12s)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
