import React, { useState } from 'react';
import {
  Shield,
  ShieldAlert,
  AlertTriangle,
  FolderOpen,
  Plus,
  Trash2,
  Lock,
  Sliders,
  RotateCcw,
  Key,
  CreditCard,
  EyeOff,
  Clock,
  Monitor,
  CheckCircle2,
  Sparkles,
  StopCircle,
} from 'lucide-react';
import { api } from '../../../services/api';

export interface SafetySettings {
  profile: 'zero_trust' | 'balanced' | 'developer';
  requireConfirmDelete: boolean;
  requireConfirmTerminal: boolean;
  blockPaymentGateways: boolean;
  preventSelfKill: boolean;
  credentialProtection: boolean;
  maskApiKeys: boolean;
  maskCreditCards: boolean;
  maskPasswords: boolean;
  confirmationTimeoutSec: number;
  blacklistPaths: string[];
  safeWorkspaces: string[];
  blockedApplications: string[];
}

const defaultSafetySettings: SafetySettings = {
  profile: 'balanced',
  requireConfirmDelete: true,
  requireConfirmTerminal: true,
  blockPaymentGateways: true,
  preventSelfKill: true,
  credentialProtection: true,
  maskApiKeys: true,
  maskCreditCards: true,
  maskPasswords: true,
  confirmationTimeoutSec: 30,
  blacklistPaths: ['C:\\Windows\\System32', 'C:\\Program Files', 'C:\\Windows\\SysWOW64'],
  safeWorkspaces: ['D:\\projects', 'C:\\Users\\Public\\Workspace'],
  blockedApplications: ['Bitwarden', '1Password', 'KeePass', 'Personal Banking Tab'],
};

const BLACKLIST_PRESETS = [
  'C:\\Windows\\System32',
  'C:\\Program Files',
  'C:\\Windows\\Registry',
  'C:\\Users\\%USERNAME%\\AppData\\Roaming',
];

const BLOCKED_APP_PRESETS = [
  'Bitwarden',
  '1Password',
  'KeePass',
  'WhatsApp Desktop',
  'Signal',
];

export const SafetyTab: React.FC = () => {
  const [safetySettings, setSafetySettings] = useState<SafetySettings>(() => {
    try {
      const saved = localStorage.getItem('seyal_safety_config');
      return saved ? { ...defaultSafetySettings, ...JSON.parse(saved) } : defaultSafetySettings;
    } catch {
      return defaultSafetySettings;
    }
  });

  const [newBlacklistPath, setNewBlacklistPath] = useState('');
  const [newSafeWorkspace, setNewSafeWorkspace] = useState('');
  const [newBlockedApp, setNewBlockedApp] = useState('');
  const [safetyAlertMsg, setSafetyAlertMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setSafetyAlertMsg(msg);
    setTimeout(() => setSafetyAlertMsg(null), 4000);
  };

  const updateSafetySetting = <K extends keyof SafetySettings>(key: K, val: SafetySettings[K]) => {
    setSafetySettings((prev) => {
      const updated = { ...prev, [key]: val };
      try {
        localStorage.setItem('seyal_safety_config', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  const applyProfile = (profile: 'zero_trust' | 'balanced' | 'developer') => {
    let updated: SafetySettings;
    if (profile === 'zero_trust') {
      updated = {
        ...safetySettings,
        profile: 'zero_trust',
        requireConfirmDelete: true,
        requireConfirmTerminal: true,
        blockPaymentGateways: true,
        preventSelfKill: true,
        credentialProtection: true,
        maskApiKeys: true,
        maskCreditCards: true,
        maskPasswords: true,
        confirmationTimeoutSec: 15,
      };
      showToast('Applied Zero-Trust Paranoid Guardrail profile 🔒');
    } else if (profile === 'developer') {
      updated = {
        ...safetySettings,
        profile: 'developer',
        requireConfirmDelete: false,
        requireConfirmTerminal: false,
        blockPaymentGateways: true,
        preventSelfKill: true,
        credentialProtection: true,
        maskApiKeys: true,
        maskCreditCards: true,
        maskPasswords: true,
        confirmationTimeoutSec: 60,
      };
      showToast('Applied High-Velocity Developer profile ⚡');
    } else {
      updated = {
        ...safetySettings,
        profile: 'balanced',
        requireConfirmDelete: true,
        requireConfirmTerminal: true,
        blockPaymentGateways: true,
        preventSelfKill: true,
        credentialProtection: true,
        maskApiKeys: true,
        maskCreditCards: true,
        maskPasswords: true,
        confirmationTimeoutSec: 30,
      };
      showToast('Applied Balanced Operator Guardrail profile ⚖️');
    }
    setSafetySettings(updated);
    try {
      localStorage.setItem('seyal_safety_config', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetToDefaults = () => {
    if (!confirm('Reset all safety guardrails to factory strict standards?')) return;
    setSafetySettings(defaultSafetySettings);
    try {
      localStorage.setItem('seyal_safety_config', JSON.stringify(defaultSafetySettings));
    } catch (e) {
      console.error(e);
    }
    showToast('Reset safety guardrails to factory defaults 🛡️');
  };

  const handleTriggerEmergencyStop = async () => {
    try {
      await api.emergencyStopTasks('EMERGENCY FREEZE initiated by Operator');
      showToast('🚨 EMERGENCY STOP EXECUTED: All background agent tasks frozen.');
    } catch (err: any) {
      showToast(`Emergency Stop failed: ${err?.message || err}`);
    }
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

  // Active guards count
  const activeSafeguardsCount = [
    safetySettings.requireConfirmDelete,
    safetySettings.requireConfirmTerminal,
    safetySettings.blockPaymentGateways,
    safetySettings.preventSelfKill,
    safetySettings.credentialProtection,
    safetySettings.maskApiKeys,
    safetySettings.maskCreditCards,
    safetySettings.maskPasswords,
  ].filter(Boolean).length;

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar animate-fadeIn">
      {/* Sticky Cyber Header */}
      <div className="px-6 sm:px-8 py-4 border-b border-rose-500/20 shrink-0 sticky top-0 bg-[#080e1d]/95 backdrop-blur-md z-40 shadow-lg shadow-black/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 shadow-sm shadow-rose-500/20">
              <ShieldAlert className="w-5 h-5 text-rose-400 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Safety & Operator Guardrails
                <span className="px-2 py-0.5 text-[10px] uppercase font-mono tracking-wider font-semibold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30">
                  Sandboxed
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Autonomous system boundaries, critical command approvals, and emergency execution freeze.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleResetToDefaults}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-600 text-xs font-medium text-slate-300 transition-all cursor-pointer"
              title="Reset to factory safe defaults"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset Defaults</span>
            </button>
            <button
              type="button"
              onClick={handleTriggerEmergencyStop}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 border border-rose-500 text-xs font-bold text-white shadow-md shadow-rose-950/50 transition-all cursor-pointer"
              title="Immediately freeze all running agent subprocesses"
            >
              <StopCircle className="w-3.5 h-3.5" />
              <span>Emergency Freeze</span>
            </button>
          </div>
        </div>

        {/* Top Security HUD Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3 pt-3 border-t border-slate-800/80 text-[11px]">
          <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              Shield Status:
            </span>
            <span className="font-semibold text-emerald-400 font-mono">ACTIVE (8/8)</span>
          </div>

          <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              Interceptors Active:
            </span>
            <span className="font-semibold text-cyan-300 font-mono">{activeSafeguardsCount} Rules</span>
          </div>

          <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5 text-rose-400" />
              Protected Paths:
            </span>
            <span className="font-semibold text-rose-300 font-mono">{safetySettings.blacklistPaths.length} Zones</span>
          </div>

          <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <EyeOff className="w-3.5 h-3.5 text-amber-400" />
              Masked Apps:
            </span>
            <span className="font-semibold text-amber-300 font-mono">{safetySettings.blockedApplications.length} Apps</span>
          </div>
        </div>
      </div>

      {/* Toast Notification Banner */}
      {safetyAlertMsg && (
        <div className="mx-6 sm:mx-8 mt-4 bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs px-4 py-2.5 rounded-lg flex items-center gap-2.5 shadow-lg shadow-rose-950/50 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="font-medium">{safetyAlertMsg}</span>
        </div>
      )}

      {/* Main Content Body */}
      <div className="p-6 sm:p-8 space-y-6 w-full max-w-5xl mx-auto">
        {/* 1. 1-Click Security Profiles */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              1-Click Guardrail Security Profiles
            </span>
            <span className="text-slate-500">Select pre-configured safety stance</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Zero-Trust Paranoid */}
            <div
              onClick={() => applyProfile('zero_trust')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                safetySettings.profile === 'zero_trust'
                  ? 'bg-rose-950/30 border-rose-500/50 shadow-md shadow-rose-950/30'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    Zero-Trust Paranoid
                  </span>
                  {safetySettings.profile === 'zero_trust' && (
                    <span className="text-[10px] font-mono font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Maximum protection. Requires operator confirmation before virtually every action. 15s quick timeout.
                </p>
              </div>
            </div>

            {/* Balanced Operator */}
            <div
              onClick={() => applyProfile('balanced')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                safetySettings.profile === 'balanced'
                  ? 'bg-cyan-950/30 border-cyan-500/50 shadow-md shadow-cyan-950/30'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    Balanced Operator
                  </span>
                  {safetySettings.profile === 'balanced' && (
                    <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">
                      RECOMMENDED
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Balanced guardrails. Blocks system folders, payments, and dangerous bash/cmd. Smooth autonomous flow.
                </p>
              </div>
            </div>

            {/* High-Velocity Developer */}
            <div
              onClick={() => applyProfile('developer')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                safetySettings.profile === 'developer'
                  ? 'bg-emerald-950/30 border-emerald-500/50 shadow-md shadow-emerald-950/30'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    High-Velocity Dev
                  </span>
                  {safetySettings.profile === 'developer' && (
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Fast code iteration. Minimal approval prompts for files/terminal inside your safe workspace directory.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Destructive Action Safeguards */}
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

        {/* 3. Financial & Checkout Protections */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Financial & Banking Safeguard</h3>
                <p className="text-[11px] text-slate-400">Prevent automated interaction with payment gateways and financial assets</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-200">
                Auto-Block Payment & Checkout Automation
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Instantly freeze browser and keyboard automation when payment portals, OTP inputs, or credit card forms are detected.
              </p>
            </div>
            {renderToggle(safetySettings.blockPaymentGateways, (val) =>
              updateSafetySetting('blockPaymentGateways', val)
            )}
          </div>
        </div>

        {/* 4. Granular Sensitive Data & PII Masking */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                <Key className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">PII & Secret Masking Sandboxing</h3>
                <p className="text-[11px] text-slate-400">Automatically censor sensitive secrets from screen perception and memory logs</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Mask API Keys */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">API Keys & Tokens</span>
                <span className="text-[10px] text-slate-400">sk-..., JWT, Bearer</span>
              </div>
              {renderToggle(safetySettings.maskApiKeys, (val) =>
                updateSafetySetting('maskApiKeys', val)
              )}
            </div>

            {/* Mask Credit Cards */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">Credit Cards & CVV</span>
                <span className="text-[10px] text-slate-400">Card numbers, Expiry</span>
              </div>
              {renderToggle(safetySettings.maskCreditCards, (val) =>
                updateSafetySetting('maskCreditCards', val)
              )}
            </div>

            {/* Mask Passwords */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">Password Inputs</span>
                <span className="text-[10px] text-slate-400">Input fields & hashes</span>
              </div>
              {renderToggle(safetySettings.maskPasswords, (val) =>
                updateSafetySetting('maskPasswords', val)
              )}
            </div>
          </div>
        </div>

        {/* 5. Dual-Zone Filesystem Sandboxing (Blacklist vs Whitelist) */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20">
                <FolderOpen className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Filesystem Zone Protection (Path Blacklist & Whitelist)</h3>
                <p className="text-[11px] text-slate-400">Define prohibited operating paths and allowed development sandboxes</p>
              </div>
            </div>
          </div>

          {/* Blacklisted Paths */}
          <div className="space-y-3">
            <span className="text-xs font-semibold text-rose-300 flex items-center gap-1.5">
              🚫 Prohibited Blacklist Directories (Agent strictly blocked from reading/modifying)
            </span>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] text-slate-500 self-center">Quick add:</span>
              {BLACKLIST_PRESETS.map((bp) => (
                <button
                  key={bp}
                  type="button"
                  onClick={() => {
                    if (!safetySettings.blacklistPaths.includes(bp)) {
                      updateSafetySetting('blacklistPaths', [...safetySettings.blacklistPaths, bp]);
                    }
                  }}
                  className="px-2 py-0.5 rounded text-[10px] bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800"
                >
                  + {bp}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newBlacklistPath}
                onChange={(e) => setNewBlacklistPath(e.target.value)}
                placeholder="e.g. C:\Windows\System32"
                className="flex-1 bg-slate-950/80 border border-slate-700/80 focus:border-cyan-500/60 rounded-xl px-3.5 py-2 text-xs text-slate-100 font-mono placeholder-slate-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newBlacklistPath.trim()) return;
                  if (!safetySettings.blacklistPaths.includes(newBlacklistPath.trim())) {
                    updateSafetySetting('blacklistPaths', [...safetySettings.blacklistPaths, newBlacklistPath.trim()]);
                  }
                  setNewBlacklistPath('');
                }}
                className="px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/35 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Prohibited Path</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {safetySettings.blacklistPaths.map((path) => (
                <div
                  key={path}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 font-mono text-xs text-slate-300"
                >
                  <span className="truncate">{path}</span>
                  <button
                    type="button"
                    onClick={() => {
                      updateSafetySetting(
                        'blacklistPaths',
                        safetySettings.blacklistPaths.filter((p) => p !== path)
                      );
                    }}
                    className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-300 transition-colors ml-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Whitelisted Safe Workspaces */}
          <div className="space-y-3 pt-3 border-t border-slate-800/60">
            <span className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
              📁 Safe Workspaces Whitelist (Trusted developer zones with relaxed permissions)
            </span>

            <div className="flex gap-2">
              <input
                type="text"
                value={newSafeWorkspace}
                onChange={(e) => setNewSafeWorkspace(e.target.value)}
                placeholder="e.g. D:\projects or C:\Users\YourName\Workspace"
                className="flex-1 bg-slate-950/80 border border-slate-700/80 focus:border-cyan-500/60 rounded-xl px-3.5 py-2 text-xs text-slate-100 font-mono placeholder-slate-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newSafeWorkspace.trim()) return;
                  if (!safetySettings.safeWorkspaces.includes(newSafeWorkspace.trim())) {
                    updateSafetySetting('safeWorkspaces', [...safetySettings.safeWorkspaces, newSafeWorkspace.trim()]);
                  }
                  setNewSafeWorkspace('');
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-500/40 text-emerald-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Safe Zone</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {safetySettings.safeWorkspaces.map((path) => (
                <div
                  key={path}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 font-mono text-xs text-emerald-300/90"
                >
                  <span className="truncate">{path}</span>
                  <button
                    type="button"
                    onClick={() => {
                      updateSafetySetting(
                        'safeWorkspaces',
                        safetySettings.safeWorkspaces.filter((p) => p !== path)
                      );
                    }}
                    className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-300 transition-colors ml-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 6. Sensitive Applications & Windows Blacklist */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                <Monitor className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Sensitive Applications & Windows Blacklist</h3>
                <p className="text-[11px] text-slate-400">
                  Applications that Seyal AI must never click, screenshot, or automate
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {/* Quick App Presets */}
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] text-slate-500 self-center">Popular apps:</span>
              {BLOCKED_APP_PRESETS.map((app) => (
                <button
                  key={app}
                  type="button"
                  onClick={() => {
                    if (!safetySettings.blockedApplications.includes(app)) {
                      updateSafetySetting('blockedApplications', [...safetySettings.blockedApplications, app]);
                    }
                  }}
                  className="px-2 py-0.5 rounded text-[10px] bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800"
                >
                  + {app}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newBlockedApp}
                onChange={(e) => setNewBlockedApp(e.target.value)}
                placeholder="e.g. Bitwarden, Keepass, Chrome Banking"
                className="flex-1 bg-slate-950/80 border border-slate-700/80 focus:border-cyan-500/60 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newBlockedApp.trim()) return;
                  if (!safetySettings.blockedApplications.includes(newBlockedApp.trim())) {
                    updateSafetySetting('blockedApplications', [...safetySettings.blockedApplications, newBlockedApp.trim()]);
                  }
                  setNewBlockedApp('');
                }}
                className="px-4 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/35 border border-cyan-500/40 text-cyan-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Masked App</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {safetySettings.blockedApplications.map((app) => (
                <div
                  key={app}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300"
                >
                  <EyeOff className="w-3.5 h-3.5 text-rose-400" />
                  <span>{app}</span>
                  <button
                    type="button"
                    onClick={() => {
                      updateSafetySetting(
                        'blockedApplications',
                        safetySettings.blockedApplications.filter((a) => a !== app)
                      );
                    }}
                    className="hover:text-rose-400 transition-colors ml-1"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 7. Emergency Kill-Switch Hero Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-rose-950/50 via-slate-900/90 to-slate-900/90 border border-rose-500/40 shadow-xl shadow-rose-950/30 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300">
              <ShieldAlert className="w-5 h-5 text-rose-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-rose-200">Emergency Execution Freeze Kill-Switch</h3>
              <p className="text-xs text-slate-400">
                Instantly revoke all mouse/keyboard perception and kill all running agent subprocesses.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-t border-rose-500/20">
            <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
              If Seyal AI triggers unexpected loops or takes unauthorized desktop actions, press this button or tap <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-mono text-[10px] border border-slate-700">Ctrl+Alt+Escape</kbd> to immediately release OS control.
            </p>
            <button
              type="button"
              onClick={handleTriggerEmergencyStop}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-rose-950/60 border border-rose-400/40 transition-all cursor-pointer shrink-0 active:scale-95"
            >
              <StopCircle className="w-4 h-4" />
              <span>TRIGGER EMERGENCY FREEZE</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
