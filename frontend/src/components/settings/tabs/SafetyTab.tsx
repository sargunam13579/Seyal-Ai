import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldAlert,
  AlertTriangle,
  FolderOpen,
  Sliders,
  RotateCcw,
  EyeOff,
  StopCircle,
} from 'lucide-react';
import { api } from '../../../services/api';
import {
  defaultSafetySettings,
  SecurityProfilesCard,
  DestructiveActionSafeguardsCard,
  FinancialPrivacyMaskingCard,
  RestrictedZonesCard,
  EmergencyKillswitchCard,
} from './safety';
import type { SafetySettings } from './safety';

export type { SafetySettings };

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

  useEffect(() => {
    api
      .getSafetySettings()
      .then((res) => {
        if (res) {
          setSafetySettings((prev) => ({ ...prev, ...res }));
        }
      })
      .catch((err) => console.warn('Could not load backend safety settings:', err));
  }, []);

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
      api.updateSafetySettings(updated).catch((err) => {
        console.warn('Failed to sync safety setting with backend:', err);
      });
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
    api.updateSafetySettings(updated).catch((err) => {
      console.warn('Failed to sync safety profile with backend:', err);
    });
  };

  const handleResetToDefaults = () => {
    if (!confirm('Reset all safety guardrails to factory strict standards?')) return;
    setSafetySettings(defaultSafetySettings);
    try {
      localStorage.setItem('seyal_safety_config', JSON.stringify(defaultSafetySettings));
    } catch (e) {
      console.error(e);
    }
    api.updateSafetySettings(defaultSafetySettings).catch((err) => {
      console.warn('Failed to reset safety settings on backend:', err);
    });
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
                <span>Safety & Operator Guardrails</span>
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
        <SecurityProfilesCard
          currentProfile={safetySettings.profile}
          onApplyProfile={applyProfile}
        />

        {/* 2. Destructive Action Safeguards */}
        <DestructiveActionSafeguardsCard
          safetySettings={safetySettings}
          updateSafetySetting={updateSafetySetting}
          renderToggle={renderToggle}
        />

        {/* 3 & 4. Financial & PII Masking */}
        <FinancialPrivacyMaskingCard
          safetySettings={safetySettings}
          updateSafetySetting={updateSafetySetting}
          renderToggle={renderToggle}
        />

        {/* 5 & 6. Restricted Zones & Blacklists */}
        <RestrictedZonesCard
          safetySettings={safetySettings}
          updateSafetySetting={updateSafetySetting}
          newBlacklistPath={newBlacklistPath}
          setNewBlacklistPath={setNewBlacklistPath}
          newSafeWorkspace={newSafeWorkspace}
          setNewSafeWorkspace={setNewSafeWorkspace}
          newBlockedApp={newBlockedApp}
          setNewBlockedApp={setNewBlockedApp}
        />

        {/* 7. Emergency Killswitch Hero */}
        <EmergencyKillswitchCard
          onTriggerEmergencyStop={handleTriggerEmergencyStop}
        />
      </div>
    </div>
  );
};

export default SafetyTab;
