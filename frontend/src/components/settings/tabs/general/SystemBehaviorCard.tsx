import React from 'react';
import { Monitor, Power, Layers, Pin, Cpu } from 'lucide-react';
import type { GeneralSettings } from './types';

interface SystemBehaviorCardProps {
  settings: GeneralSettings;
  updateSetting: <K extends keyof GeneralSettings>(key: K, value: GeneralSettings[K]) => void;
  renderToggle: (checked: boolean, onChange: (val: boolean) => void) => React.ReactNode;
}

export const SystemBehaviorCard: React.FC<SystemBehaviorCardProps> = ({
  settings,
  updateSetting,
  renderToggle,
}) => {
  return (
    <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
            <Monitor className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Desktop & Windows System Behavior</h3>
            <p className="text-[11px] text-slate-400">
              Window controls, startup automation, and system tray management
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {/* Launch on Startup */}
        <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Power className="w-3.5 h-3.5 text-cyan-400" />
              Launch on Windows Startup
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Automatically start Seyal AI in the background when you turn on your PC.
            </p>
          </div>
          {renderToggle(settings.launchOnStartup, (val) => updateSetting('launchOnStartup', val))}
        </div>

        {/* Minimize to Tray on Close */}
        <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              Keep Running in System Tray on Close
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Clicking the window close (X) button minimizes Seyal AI to the system tray so voice commands and autonomous tasks continue uninterrupted.
            </p>
          </div>
          {renderToggle(settings.minimizeToTrayOnClose, (val) => updateSetting('minimizeToTrayOnClose', val))}
        </div>

        {/* Start Minimized */}
        <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-slate-200">
              Start Minimized to Tray
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Start silently in the taskbar tray without showing the main window on startup.
            </p>
          </div>
          {renderToggle(settings.startMinimized, (val) => updateSetting('startMinimized', val))}
        </div>

        {/* Always on Top */}
        <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Pin className="w-3.5 h-3.5 text-amber-400" />
              Always on Top (Floating Window)
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Pin the Seyal AI window over other desktop applications during active work sessions.
            </p>
          </div>
          {renderToggle(settings.alwaysOnTop, (val) => updateSetting('alwaysOnTop', val))}
        </div>

        {/* Hardware Acceleration */}
        <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              Hardware GPU Acceleration
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Use native GPU rendering pipelines for smooth glassmorphic UI and fast screen captures.
            </p>
          </div>
          {renderToggle(settings.hardwareAcceleration, (val) => updateSetting('hardwareAcceleration', val))}
        </div>
      </div>
    </div>
  );
};
