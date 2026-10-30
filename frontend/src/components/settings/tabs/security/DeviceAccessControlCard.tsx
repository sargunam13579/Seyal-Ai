import React from 'react';
import { Lock, Eye, EyeOff, Fingerprint, Clock, ShieldCheck, ShieldAlert } from 'lucide-react';
import type { SecuritySettings } from './types';

interface DeviceAccessControlCardProps {
  securitySettings: SecuritySettings;
  pinChangeInput: string;
  showPin: boolean;
  setPinChangeInput: (val: string) => void;
  setShowPin: (val: boolean) => void;
  onUpdatePin: () => void;
  onUpdateSetting: <K extends keyof SecuritySettings>(key: K, val: SecuritySettings[K]) => void;
}

export const DeviceAccessControlCard: React.FC<DeviceAccessControlCardProps> = ({
  securitySettings,
  pinChangeInput,
  showPin,
  setPinChangeInput,
  setShowPin,
  onUpdatePin,
  onUpdateSetting,
}) => {
  const renderToggle = (checked: boolean, onChange: (val: boolean) => void) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
        checked ? 'bg-cyan-500 justify-end shadow-sm shadow-cyan-500/50' : 'bg-slate-700 justify-start'
      }`}
    >
      <span className="w-4 h-4 rounded-full bg-white shadow-md transition-all" />
    </button>
  );

  return (
    <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Device Access & Session Lock</h3>
            <p className="text-[11px] text-slate-400">Require master authentication to unlock Seyal AI interface</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {/* Master PIN Lock */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-200">
                Master Passcode PIN Lock
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Require a 4 to 6 digit security PIN before revealing conversational history, autonomous controls, or secrets.
              </p>
            </div>
            {renderToggle(securitySettings.pinLockEnabled, (val) =>
              onUpdateSetting('pinLockEnabled', val)
            )}
          </div>

          {securitySettings.pinLockEnabled && (
            <div className="pt-3 border-t border-slate-800/60 flex flex-wrap items-center gap-3 animate-fadeIn">
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  maxLength={6}
                  value={pinChangeInput}
                  onChange={(e) => setPinChangeInput(e.target.value)}
                  placeholder="Set new 4-6 digit PIN"
                  className="w-52 bg-slate-900 border border-slate-700/80 focus:border-cyan-500 rounded-xl pl-3 pr-8 py-1.5 text-xs text-slate-100 font-mono placeholder-slate-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <button
                type="button"
                onClick={onUpdatePin}
                className="px-3.5 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/35 border border-cyan-500/40 text-cyan-200 text-xs font-semibold transition-all cursor-pointer"
              >
                Update PIN
              </button>
              <span className="text-[11px] font-mono text-slate-500">
                Current: •••• (Active)
              </span>
            </div>
          )}
        </div>

        {/* Windows Hello Biometrics */}
        <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <Fingerprint className="w-3.5 h-3.5 text-indigo-400" />
              <span>Windows Hello & Biometric Unlock</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Use integrated laptop fingerprint reader or Windows Hello facial recognition for instantaneous operator authorization.
            </p>
          </div>
          {renderToggle(securitySettings.biometricsEnabled, (val) =>
            onUpdateSetting('biometricsEnabled', val)
          )}
        </div>

        {/* Inactivity Auto-Lock Timeout */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              Inactivity Auto-Lock Timeout
            </span>
            <span className="font-mono text-cyan-300 text-[11px]">
              {securitySettings.autoLockMinutes === 0 ? 'Never Auto-Lock' : `Locks after ${securitySettings.autoLockMinutes}m idle`}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Automatically freeze workspace after inactivity to prevent unauthorized physical access.
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {[
              { label: '1 Minute', val: 1 },
              { label: '5 Minutes', val: 5 },
              { label: '15 Minutes (Default)', val: 15 },
              { label: '30 Minutes', val: 30 },
              { label: '60 Minutes', val: 60 },
              { label: 'Never', val: 0 },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => onUpdateSetting('autoLockMinutes', item.val)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  securitySettings.autoLockMinutes === item.val
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Clear Clipboard on Lock */}
        <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Clear Clipboard on Lock (Zero Data Leak)</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Automatically purge copied passwords, secrets, and clipboard text from Windows memory whenever Seyal AI locks.
            </p>
          </div>
          {renderToggle(securitySettings.clearClipboardOnLock, (val) =>
            onUpdateSetting('clearClipboardOnLock', val)
          )}
        </div>

        {/* Anti-Brute Force Protection */}
        <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>Anti-Brute Force Lockdown Protection</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Enforce a 5-minute freeze if 5 consecutive incorrect PIN passcodes are attempted.
            </p>
          </div>
          {renderToggle(securitySettings.antiBruteForceLockout, (val) =>
            onUpdateSetting('antiBruteForceLockout', val)
          )}
        </div>
      </div>
    </div>
  );
};
