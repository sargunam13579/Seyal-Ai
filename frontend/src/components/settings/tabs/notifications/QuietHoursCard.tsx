import React from 'react';
import { Eye, Moon } from 'lucide-react';
import type { NotificationSettings } from './types';

interface QuietHoursCardProps {
  notifSettings: NotificationSettings;
  updateNotifSetting: <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) => void;
  renderNotifToggle: (checked: boolean, onChange: (val: boolean) => void) => React.ReactNode;
}

export const QuietHoursCard: React.FC<QuietHoursCardProps> = ({
  notifSettings,
  updateNotifSetting,
  renderNotifToggle,
}) => {
  return (
    <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Smart Focus, Vision Shield & Quiet Hours</h3>
            <p className="text-[11px] text-slate-400">Prevent popup toasts from blocking computer vision screenshots and quiet nighttime tasks</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {/* Master DND */}
        <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <span>Do Not Disturb (DND)</span>
              {notifSettings.doNotDisturb && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 font-mono">
                  MUTED
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Suppress all audio and popup alerts immediately.
            </p>
          </div>
          {renderNotifToggle(notifSettings.doNotDisturb, (val) => updateNotifSetting('doNotDisturb', val))}
        </div>

        {/* Scheduled Quiet Hours */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                <span>Overnight Scheduled Quiet Hours</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Auto-mute acoustic chimes while running background tasks overnight so you can sleep peacefully.
              </p>
            </div>
            {renderNotifToggle(notifSettings.quietHoursEnabled, (val) =>
              updateNotifSetting('quietHoursEnabled', val)
            )}
          </div>

          {notifSettings.quietHoursEnabled && (
            <div className="pt-2 border-t border-slate-800/60 flex items-center gap-3 text-xs font-mono text-slate-300">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">From:</span>
                <input
                  type="time"
                  value={notifSettings.quietHoursStart}
                  onChange={(e) => updateNotifSetting('quietHoursStart', e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-100"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">To:</span>
                <input
                  type="time"
                  value={notifSettings.quietHoursEnd}
                  onChange={(e) => updateNotifSetting('quietHoursEnd', e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-100"
                />
              </div>
            </div>
          )}
        </div>

        {/* Auto-Mute during Screen Control */}
        <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>Auto-Mute during Autonomous Screen Control</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Suppress banners while the agent takes screenshots to prevent toasts from obscuring clickable UI elements.
            </p>
          </div>
          {renderNotifToggle(notifSettings.autoMuteScreenControl, (val) =>
            updateNotifSetting('autoMuteScreenControl', val)
          )}
        </div>
      </div>
    </div>
  );
};
