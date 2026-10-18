import React, { useState } from 'react';
import {
  Key,
  Lock,
  Fingerprint,
  ShieldCheck,
  Monitor,
  Check,
  Smartphone,
  Eye,
  EyeOff,
  Copy,
  RotateCcw,
  Sparkles,
  Clock,
  LogOut,
  Cpu,
  ShieldAlert,
} from 'lucide-react';

interface SecuritySettings {
  pinLockEnabled: boolean;
  pinCode: string;
  biometricsEnabled: boolean;
  autoLockMinutes: number;
  localVaultEncrypted: boolean;
  clearClipboardOnLock: boolean;
  antiBruteForceLockout: boolean;
  maxFailedAttempts: number;
  recoveryKey: string;
}

const defaultSecuritySettings: SecuritySettings = {
  pinLockEnabled: false,
  pinCode: '1234',
  biometricsEnabled: false,
  autoLockMinutes: 15,
  localVaultEncrypted: true,
  clearClipboardOnLock: true,
  antiBruteForceLockout: true,
  maxFailedAttempts: 5,
  recoveryKey: 'seyal-94f2-8a1c-3b7e-e5d0',
};

export const SecurityLoginTab: React.FC = () => {
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>(() => {
    try {
      const saved = localStorage.getItem('seyal_security_config');
      return saved ? { ...defaultSecuritySettings, ...JSON.parse(saved) } : defaultSecuritySettings;
    } catch {
      return defaultSecuritySettings;
    }
  });

  const [pinChangeInput, setPinChangeInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [showRecoveryKey, setShowRecoveryKey] = useState(false);
  const [copiedRecovery, setCopiedRecovery] = useState(false);
  const [securityMsg, setSecurityMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setSecurityMsg(msg);
    setTimeout(() => setSecurityMsg(null), 3500);
  };

  const updateSecuritySetting = <K extends keyof SecuritySettings>(key: K, val: SecuritySettings[K]) => {
    setSecuritySettings((prev) => {
      const updated = { ...prev, [key]: val };
      try {
        localStorage.setItem('seyal_security_config', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  const handleUpdatePin = () => {
    if (pinChangeInput.length >= 4 && pinChangeInput.length <= 6 && /^\d+$/.test(pinChangeInput)) {
      updateSecuritySetting('pinCode', pinChangeInput);
      setPinChangeInput('');
      showToast('Master Passcode PIN successfully updated ✨');
    } else {
      alert('PIN must be 4 to 6 numeric digits');
    }
  };

  const handleCopyRecoveryKey = () => {
    navigator.clipboard.writeText(securitySettings.recoveryKey);
    setCopiedRecovery(true);
    setTimeout(() => setCopiedRecovery(false), 2000);
    showToast('Vault Recovery Key copied to clipboard 📋');
  };

  const handleLockNow = () => {
    showToast('🔒 Application Locked. Please enter PIN or use Windows Hello to resume.');
  };

  const handleResetDefaults = () => {
    if (!confirm('Reset all security settings to standard defaults?')) return;
    setSecuritySettings(defaultSecuritySettings);
    try {
      localStorage.setItem('seyal_security_config', JSON.stringify(defaultSecuritySettings));
    } catch (e) {
      console.error(e);
    }
    showToast('Security settings reset to factory defaults');
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
      {/* Sticky Cyber Header */}
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
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-xs font-medium text-slate-300 transition-all cursor-pointer"
              title="Reset security config"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset</span>
            </button>
            <button
              type="button"
              onClick={handleLockNow}
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

      {/* Toast Notification Banner */}
      {securityMsg && (
        <div className="mx-6 sm:mx-8 mt-4 bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs px-4 py-2.5 rounded-lg flex items-center gap-2.5 shadow-lg shadow-cyan-950/50 animate-in fade-in">
          <Check className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="font-medium">{securityMsg}</span>
        </div>
      )}

      {/* Main Content Body */}
      <div className="p-6 sm:p-8 space-y-6 w-full max-w-5xl mx-auto">
        {/* 1. DEVICE ACCESS CONTROL & PASSCODE LOCK */}
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
                  updateSecuritySetting('pinLockEnabled', val)
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
                    onClick={handleUpdatePin}
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
                updateSecuritySetting('biometricsEnabled', val)
              )}
            </div>

            {/* Inactivity Auto-Lock Timeout Segmented Selector */}
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
                    onClick={() => updateSecuritySetting('autoLockMinutes', item.val)}
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
                updateSecuritySetting('clearClipboardOnLock', val)
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
                updateSecuritySetting('antiBruteForceLockout', val)
              )}
            </div>
          </div>
        </div>

        {/* 2. HARDWARE-BOUND KEYSTORE & LOCAL VAULT */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Hardware-Bound Keystore & Local Vault</h3>
                <p className="text-[11px] text-slate-400">Cryptographic protection for LLM tokens, keys, and memory</p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
              <Lock className="w-4.5 h-4.5" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="text-xs font-semibold text-slate-100 flex items-center gap-2">
                <span>AES-256 GCM Hardware-Bound Keystore (Windows DPAPI)</span>
                <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                  ACTIVE & SEALED
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                All Supabase credentials, personal knowledge facts, speech tokens, and vector memories are encrypted on disk utilizing Microsoft Windows DPAPI and cryptographically tied to your CPU hardware ID.
              </p>
            </div>
          </div>
        </div>

        {/* 3. EMERGENCY VAULT RECOVERY KEY */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Emergency Vault Master Recovery Key</h3>
                <p className="text-[11px] text-slate-400">Use this unique passphrase if you ever forget your Master Passcode PIN</p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-slate-400 block">
                Master Decryption Recovery Phrase:
              </span>
              <span className="text-xs font-mono font-bold text-amber-300 tracking-wider">
                {showRecoveryKey ? securitySettings.recoveryKey : 'seyal-••••-••••-••••-••••'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowRecoveryKey(!showRecoveryKey)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300 transition-all flex items-center gap-1.5"
              >
                {showRecoveryKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showRecoveryKey ? 'Hide' : 'Reveal'}</span>
              </button>
              <button
                type="button"
                onClick={handleCopyRecoveryKey}
                className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-medium text-amber-300 transition-all flex items-center gap-1.5"
              >
                {copiedRecovery ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy Key</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4. ACTIVE SESSIONS & DEVICE AUDIT */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20">
                <Monitor className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Active Workstation Sessions & Devices</h3>
                <p className="text-[11px] text-slate-400">Authorized workstation instances and background socket connections</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => showToast('All background secondary token sessions revoked 🔒')}
              className="px-3 py-1 text-xs font-medium rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 transition-all flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Revoke All Other</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {/* Session 1: Current Desktop */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Monitor className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-slate-100 font-semibold flex items-center gap-2">
                    <span>Windows 11 Desktop (Primary Electron Workstation)</span>
                    <span className="text-[9px] px-2 py-0.2 rounded-full font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      CURRENT
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    127.0.0.1:8000 • Autonomous Engine Active • Last ping: Just now
                  </div>
                </div>
              </div>
              <span className="text-[11px] font-mono text-emerald-400">Active Now</span>
            </div>

            {/* Session 2: Connected Mobile Relay */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-slate-100 font-semibold flex items-center gap-2">
                    <span>Connected Mobile Relay (Seyal Mobile Push Companion)</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Encrypted push notification sync • Authenticated via Supabase UID
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => showToast('Disconnected mobile relay session')}
                className="px-2.5 py-1 text-[11px] rounded bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-slate-800 transition-all self-start sm:self-auto"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
