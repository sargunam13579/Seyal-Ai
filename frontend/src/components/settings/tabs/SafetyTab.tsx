import React, { useState } from 'react';
import {
  Shield,
  ShieldAlert,
  AlertTriangle,
  FolderOpen,
  Plus,
  Trash2,
} from 'lucide-react';
import { api } from '../../../services/api';

interface SafetySettings {
  requireConfirmDelete: boolean;
  requireConfirmTerminal: boolean;
  blockPaymentGateways: boolean;
  preventSelfKill: boolean;
  credentialProtection: boolean;
  blacklistPaths: string[];
}

const defaultSafetySettings: SafetySettings = {
  requireConfirmDelete: true,
  requireConfirmTerminal: true,
  blockPaymentGateways: true,
  preventSelfKill: true,
  credentialProtection: true,
  blacklistPaths: ['C:\\Windows\\System32', 'C:\\Program Files'],
};

export const SafetyTab: React.FC = () => {
  const [safetySettings, setSafetySettings] = useState<SafetySettings>(() => {
    try {
      const saved = localStorage.getItem('nexus_safety_config');
      return saved ? { ...defaultSafetySettings, ...JSON.parse(saved) } : defaultSafetySettings;
    } catch {
      return defaultSafetySettings;
    }
  });

  const [newBlacklistPath, setNewBlacklistPath] = useState('');
  const [safetyAlertMsg, setSafetyAlertMsg] = useState<string | null>(null);

  const updateSafetySetting = (key: keyof SafetySettings, val: any) => {
    setSafetySettings((prev) => {
      const updated = { ...prev, [key]: val };
      try {
        localStorage.setItem('nexus_safety_config', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  const handleTriggerEmergencyStop = async () => {
    try {
      await api.emergencyStopTasks('EMERGENCY FREEZE initiated by Operator');
      setSafetyAlertMsg('EMERGENCY STOP EXECUTED: All background agent tasks frozen.');
      setTimeout(() => setSafetyAlertMsg(null), 4000);
    } catch (err: any) {
      alert(`Emergency Stop execution failed: ${err?.message || err}`);
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

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar animate-fadeIn">
      {/* Header */}
      <div className="px-8 py-5 border-b border-cyan-500/20 shrink-0 sticky top-0 bg-[#080e1d]/95 backdrop-blur-md z-40 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 shadow-sm">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>Safety & Operator Guardrails</span>
            </h2>
            <p className="text-xs text-slate-400">
              Autonomous boundaries, critical command approvals, and emergency execution freeze
            </p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 font-mono flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          SHIELD ACTIVE
        </span>
      </div>

      <div className="p-8 sm:p-10 space-y-6 w-full max-w-5xl">
        {safetyAlertMsg && (
          <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-500 text-white shadow-lg flex items-center gap-3 animate-fadeIn">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <span className="text-xs font-semibold">{safetyAlertMsg}</span>
          </div>
        )}

        {/* 1. DESTRUCTIVE ACTION SAFEGUARDS */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Destructive Action Protections</h3>
                <p className="text-[11px] text-slate-400">Enforce operator confirmation before executing potentially harmful OS changes</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {/* Confirm File Deletions */}
            <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-200">
                  Confirm File & Directory Deletions
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Require explicit operator consent before the agent permanently deletes or moves any file system items.
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
                  Intercept critical PowerShell/CMD calls (e.g. format, registry modifications, diskpart, kill process).
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
                  Block the autonomous agent from terminating its own backend processes, daemon runners, or watchdog monitors.
                </p>
              </div>
              {renderToggle(safetySettings.preventSelfKill, (val) =>
                updateSafetySetting('preventSelfKill', val)
              )}
            </div>

            {/* Credential Masking */}
            <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-200">
                  Live Credential & Secret Masking
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Automatically censor API keys, passwords, and authorization tokens in screen captures and activity logs.
                </p>
              </div>
              {renderToggle(safetySettings.credentialProtection, (val) =>
                updateSafetySetting('credentialProtection', val)
              )}
            </div>
          </div>
        </div>

        {/* 2. FINANCIAL PROTECTION */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Financial & Banking Safeguard</h3>
                <p className="text-[11px] text-slate-400">Prevent automated interaction with payment gateways</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-200">
                  Auto-Block Payment & Checkout Automation
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Instantly halt browser and keyboard automation when payment portals, OTP prompts, or credit card forms are detected.
                </p>
              </div>
              {renderToggle(safetySettings.blockPaymentGateways, (val) =>
                updateSafetySetting('blockPaymentGateways', val)
              )}
            </div>
          </div>
        </div>

        {/* 3. PATH BLACKLIST */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20">
                <FolderOpen className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Protected Filesystem Zones (Path Blacklist)</h3>
                <p className="text-[11px] text-slate-400">Agent access to these directories is strictly blocked by the system sandbox</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={newBlacklistPath}
                onChange={(e) => setNewBlacklistPath(e.target.value)}
                placeholder="e.g. C:\Windows\System32"
                className="flex-1 bg-slate-950/80 border border-slate-700/80 focus:border-cyan-500/60 rounded-xl px-3.5 py-2 text-xs text-slate-100 font-mono placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newBlacklistPath.trim()) return;
                  const current = safetySettings.blacklistPaths || [];
                  if (!current.includes(newBlacklistPath.trim())) {
                    updateSafetySetting('blacklistPaths', [...current, newBlacklistPath.trim()]);
                  }
                  setNewBlacklistPath('');
                }}
                className="px-4 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/35 border border-cyan-500/40 text-cyan-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Path</span>
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {(safetySettings.blacklistPaths || []).map((path: string) => (
                <div
                  key={path}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 font-mono text-xs text-slate-300"
                >
                  <span className="truncate">{path}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = (safetySettings.blacklistPaths || []).filter((p: string) => p !== path);
                      updateSafetySetting('blacklistPaths', updated);
                    }}
                    className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors ml-2 cursor-pointer"
                    title="Remove protected path"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4. EMERGENCY KILL-SWITCH */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-rose-950/40 via-slate-900/80 to-slate-900/80 border border-rose-500/40 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-rose-500/20 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-rose-200">Emergency Task Kill-Switch</h3>
                <p className="text-[11px] text-slate-400">Immediate hard-freeze of all active computer-use tasks, subprocesses, and automation loops</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1">
            <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
              If the agent displays unintended autonomous behavior or gets caught in a loop, trigger this kill-switch to immediately release cursor control and terminate all child tasks.
            </p>
            <button
              type="button"
              onClick={handleTriggerEmergencyStop}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-rose-950/60 border border-rose-400/40 transition-all cursor-pointer shrink-0 active:scale-95"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>TRIGGER EMERGENCY FREEZE</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
