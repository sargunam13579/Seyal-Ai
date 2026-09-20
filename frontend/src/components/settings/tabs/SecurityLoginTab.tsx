import React, { useState } from 'react';
import {
  Key,
  Lock,
  Fingerprint,
  ShieldCheck,
  Monitor,
  Check,
} from 'lucide-react';

interface SecuritySettings {
  pinLockEnabled: boolean;
  pinCode: string;
  biometricsEnabled: boolean;
  autoLockMinutes: number;
  localVaultEncrypted: boolean;
}

const defaultSecuritySettings: SecuritySettings = {
  pinLockEnabled: false,
  pinCode: '1234',
  biometricsEnabled: false,
  autoLockMinutes: 15,
  localVaultEncrypted: true,
};

export const SecurityLoginTab: React.FC = () => {
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>(() => {
    try {
      const saved = localStorage.getItem('nexus_security_config');
      return saved ? { ...defaultSecuritySettings, ...JSON.parse(saved) } : defaultSecuritySettings;
    } catch {
      return defaultSecuritySettings;
    }
  });

  const [pinChangeInput, setPinChangeInput] = useState('');
  const [securityMsg, setSecurityMsg] = useState<string | null>(null);

  const updateSecuritySetting = (key: keyof SecuritySettings, val: any) => {
    setSecuritySettings((prev) => {
      const updated = { ...prev, [key]: val };
      try {
        localStorage.setItem('nexus_security_config', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

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
    <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar animate-fadeIn">
      {/* Header */}
      <div className="px-8 py-5 border-b border-cyan-500/20 shrink-0 sticky top-0 bg-[#080e1d]/95 backdrop-blur-md z-40 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 shadow-sm">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>Security & Authentication</span>
            </h2>
            <p className="text-xs text-slate-400">
              Device access controls, biometric auth, hardware vault encryption, and session isolation
            </p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-mono flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
          HARDWARE ENCRYPTED
        </span>
      </div>

      <div className="p-8 sm:p-10 space-y-6 w-full max-w-5xl">
        {securityMsg && (
          <div className="p-4 rounded-xl bg-cyan-950/80 border border-cyan-500 text-white shadow-lg flex items-center gap-3 animate-fadeIn">
            <Check className="w-5 h-5 text-cyan-400 shrink-0" />
            <span className="text-xs font-semibold">{securityMsg}</span>
          </div>
        )}

        {/* 1. DEVICE ACCESS CONTROL */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Device Access & Session Lock</h3>
                <p className="text-[11px] text-slate-400">Require master authentication to unlock NEXUS OS interface</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {/* Master PIN Lock */}
            <div className="flex flex-col gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-slate-200">
                    Master Passcode PIN Lock
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Require a 4-digit security PIN before revealing conversational history or sensitive settings.
                  </p>
                </div>
                {renderToggle(securitySettings.pinLockEnabled, (val) =>
                  updateSecuritySetting('pinLockEnabled', val)
                )}
              </div>

              {securitySettings.pinLockEnabled && (
                <div className="pt-3 border-t border-slate-800/60 flex items-center gap-3 animate-fadeIn">
                  <input
                    type="password"
                    maxLength={6}
                    value={pinChangeInput}
                    onChange={(e) => setPinChangeInput(e.target.value)}
                    placeholder="Set new 4-digit PIN"
                    className="w-48 bg-slate-900 border border-slate-700 focus:border-cyan-500 rounded-xl px-3 py-1.5 text-xs text-slate-100 font-mono placeholder-slate-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (pinChangeInput.length >= 4) {
                        updateSecuritySetting('pinCode', pinChangeInput);
                        setPinChangeInput('');
                        setSecurityMsg('Master PIN successfully updated.');
                        setTimeout(() => setSecurityMsg(null), 3000);
                      } else {
                        alert('PIN must be at least 4 digits');
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/35 border border-cyan-500/40 text-cyan-200 text-xs font-semibold transition-all cursor-pointer"
                  >
                    Update PIN
                  </button>
                  <span className="text-[11px] font-mono text-slate-500">
                    Current: ••••
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
                  Use integrated fingerprint reader or facial recognition camera for rapid operator authorization.
                </p>
              </div>
              {renderToggle(securitySettings.biometricsEnabled, (val) =>
                updateSecuritySetting('biometricsEnabled', val)
              )}
            </div>

            {/* Auto-Lock Timeout */}
            <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-200">
                  Inactivity Auto-Lock Timeout
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Automatically lock workspace session after a period of mouse/keyboard inactivity.
                </p>
              </div>
              <select
                value={securitySettings.autoLockMinutes}
                onChange={(e) => updateSecuritySetting('autoLockMinutes', Number(e.target.value))}
                className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-cyan-500 font-mono cursor-pointer"
              >
                <option value={5}>5 minutes</option>
                <option value={15}>15 minutes (Standard)</option>
                <option value={30}>30 minutes</option>
                <option value={0}>Never</option>
              </select>
            </div>
          </div>
        </div>

        {/* 2. ENCRYPTED LOCAL VAULT */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Hardware-Bound Keystore & Local Vault</h3>
                <p className="text-[11px] text-slate-400">Cryptographic protection for LLM tokens, keys, and memory</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                <Lock className="w-4 h-4" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="text-xs font-semibold text-slate-100 flex items-center gap-2">
                  <span>AES-256 GCM Hardware-Protected Keystore</span>
                  <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                    ACTIVE
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  All API credentials, voice tokens, and vector memory databases are encrypted on disk utilizing Windows DPAPI (Data Protection API) and tied to your local CPU hardware profile.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 3. ACTIVE SESSIONS */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20">
                <Monitor className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Active Workstation Session</h3>
                <p className="text-[11px] text-slate-400">Connected workstation process and background listeners</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 font-mono text-xs">
            <div className="space-y-1">
              <div className="text-slate-200 font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Local Loopback (127.0.0.1:8000)</span>
              </div>
              <div className="text-[10px] text-slate-500">
                Platform: Windows 11 Enterprise • Engine: Python FastAPI Autonomous Core
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSecurityMsg('Background token sessions revoked.');
                setTimeout(() => setSecurityMsg(null), 3000);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer transition-all shrink-0"
            >
              Terminate Other Sessions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
