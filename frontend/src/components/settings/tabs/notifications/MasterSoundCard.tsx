import React from 'react';
import {
  BellRing,
  Volume2,
  VolumeX,
  Play,
  Check,
} from 'lucide-react';
import { SOUND_PRESETS } from './types';
import type { NotificationSettings } from './types';

interface MasterSoundCardProps {
  notifSettings: NotificationSettings;
  updateNotifSetting: <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) => void;
  browserPerm: string;
  onRequestDesktopPermission: () => void;
  onPlayPreset: (presetId: string, vol?: number) => void;
  renderNotifToggle: (checked: boolean, onChange: (val: boolean) => void) => React.ReactNode;
}

export const MasterSoundCard: React.FC<MasterSoundCardProps> = ({
  notifSettings,
  updateNotifSetting,
  browserPerm,
  onRequestDesktopPermission,
  onPlayPreset,
  renderNotifToggle,
}) => {
  return (
    <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-5">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
            <BellRing className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Master Controls & Auditory Sound Themes</h3>
            <p className="text-[11px] text-slate-400">Windows desktop toast banners and harmonic Web Audio synthesizer chimes</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Desktop Notifications Toggle */}
        <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-2 flex-wrap">
              <span>Desktop Push Banners</span>
              {browserPerm === 'granted' ? (
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono">
                  ✓ Allowed by Windows
                </span>
              ) : browserPerm === 'denied' ? (
                <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 font-mono">
                  ✕ Blocked in Browser
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onRequestDesktopPermission}
                  className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono hover:bg-amber-500/25 transition-colors cursor-pointer"
                >
                  ! Request Permission
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Display native Windows Toast banners when autonomous tasks complete or need attention.
            </p>
          </div>
          {renderNotifToggle(notifSettings.desktopNotifications, (val) =>
            updateNotifSetting('desktopNotifications', val)
          )}
        </div>

        {/* Sound Alerts Master Toggle */}
        <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              {notifSettings.soundAlerts ? (
                <Volume2 className="w-4 h-4 text-cyan-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-500" />
              )}
              <span>Auditory Earcon Chimes</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Play melodic acoustic synthesizer frequencies when workflows complete.
            </p>
          </div>
          {renderNotifToggle(notifSettings.soundAlerts, (val) => updateNotifSetting('soundAlerts', val))}
        </div>

        {/* Sound Themes & Volume */}
        {notifSettings.soundAlerts && (
          <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-4 animate-fadeIn">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-200">
                Acoustic Chime Theme
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                {SOUND_PRESETS.map((preset) => {
                  const isSelected = notifSettings.soundPreset === preset.id;
                  return (
                    <div
                      key={preset.id}
                      className={`p-3 rounded-xl border transition-all flex flex-col justify-between gap-2 ${
                        isSelected
                          ? 'bg-cyan-500/15 border-cyan-500/50 shadow-sm shadow-cyan-500/20'
                          : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold ${isSelected ? 'text-cyan-300' : 'text-slate-200'}`}>
                            {preset.name}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                        </div>
                        <span className="text-[10px] text-slate-500 block mt-0.5">{preset.tag}</span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                        <button
                          type="button"
                          onClick={() => {
                            updateNotifSetting('soundPreset', preset.id as any);
                            onPlayPreset(preset.id, (notifSettings.soundVolume || 80) / 100);
                          }}
                          className={`text-[10px] font-semibold px-2 py-1 rounded-md transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-cyan-500 text-slate-950 font-bold'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                        >
                          {isSelected ? 'Active' : 'Select'}
                        </button>

                        <button
                          type="button"
                          onClick={() => onPlayPreset(preset.id, (notifSettings.soundVolume || 80) / 100)}
                          className="p-1 text-slate-400 hover:text-cyan-300 cursor-pointer"
                          title="Play preview"
                        >
                          <Play className="w-3 h-3 fill-current" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Volume Slider */}
            <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-800/60">
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-slate-300">Chime Volume Level</span>
                <p className="text-[10px] text-slate-500 font-mono">Web Audio synthesizer gain</p>
              </div>
              <div className="flex items-center gap-3 w-64">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={notifSettings.soundVolume}
                  onChange={(e) => updateNotifSetting('soundVolume', Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
                <span className="text-xs font-mono text-cyan-300 font-bold w-10 text-right">
                  {notifSettings.soundVolume}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
