import React from 'react';
import { Key, RotateCcw, Lock, ShieldCheck, Fingerprint, Clock, Monitor } from 'lucide-react';
import type { SecuritySettings } from './types';

interface SecurityLoginHeaderHUDProps {
  securitySettings: SecuritySettings;
  onResetDefaults: () => void;
  onLockNow: () => void;
}

export const SecurityLoginHeaderHUD: React.FC<SecurityLoginHeaderHUDProps> = ({
  securitySettings,
  onResetDefaults,
  onLockNow,
}) => {
  return (
    <div className="px-6 sm:px-8 py-4 border-b border-indigo-500/20 shrink-0 sticky top-0 bg-[#080e1d]/95 backdrop-blur-md z-40 shadow-lg shadow-black/40">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 shadow-sm shadow-indigo-500/20">
            <Key className="w-5 h-5 text-indigo-400 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              Security & Authentication
              <span className="px-2 py-0.5 text-[10px] uppercase font-mono tracking-wider font-semibold rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                AES-256 DPAPI
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Device access controls, biometric auth, hardware vault encryption, and session isolation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={onResetDefaults}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-xs font-medium text-slate-300 transition-all cursor-pointer"
            title="Reset security config"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset</span>
          </button>
          <button
            type="button"
            onClick={onLockNow}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-xs font-bold text-white shadow-md shadow-cyan-950/50 border border-cyan-400/40 transition-all cursor-pointer"
            title="Immediately lock the desktop workspace (Ctrl+Shift+L)"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock App Now</span>
          </button>
        </div>
      </div>

      {/* Top Security HUD Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3 pt-3 border-t border-slate-800/80 text-[11px]">
        <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Vault Encryption:
          </span>
          <span className="font-semibold text-emerald-300 font-mono">AES-256 GCM</span>
        </div>

        <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Fingerprint className="w-3.5 h-3.5 text-indigo-400" />
            Windows Hello:
          </span>
          <span
            className={`font-semibold font-mono ${
              securitySettings.biometricsEnabled ? 'text-indigo-300' : 'text-slate-500'
            }`}
          >
            {securitySettings.biometricsEnabled ? 'ENABLED' : 'MUTED'}
          </span>
        </div>

        <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            Inactivity Lock:
          </span>
          <span className="font-semibold text-cyan-300 font-mono">
            {securitySettings.autoLockMinutes === 0 ? 'NEVER' : `${securitySettings.autoLockMinutes} MINS`}
          </span>
        </div>

        <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Monitor className="w-3.5 h-3.5 text-blue-400" />
            Active Sessions:
          </span>
          <span className="font-semibold text-blue-300 font-mono">2 Workstations</span>
        </div>
      </div>
    </div>
  );
};
