import React, { useState } from 'react';
import { Check } from 'lucide-react';
import {
  defaultSecuritySettings,
  SecurityLoginHeaderHUD,
  DeviceAccessControlCard,
  HardwareKeystoreCard,
  EmergencyVaultRecoveryCard,
  ActiveSessionsDeviceCard,
} from './security';
import type { SecuritySettings } from './security';

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

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar animate-fadeIn">
      {/* Sticky Cyber Header */}
      <SecurityLoginHeaderHUD
        securitySettings={securitySettings}
        onResetDefaults={handleResetDefaults}
        onLockNow={handleLockNow}
      />

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
        <DeviceAccessControlCard
          securitySettings={securitySettings}
          pinChangeInput={pinChangeInput}
          showPin={showPin}
          setPinChangeInput={setPinChangeInput}
          setShowPin={setShowPin}
          onUpdatePin={handleUpdatePin}
          onUpdateSetting={updateSecuritySetting}
        />

        {/* 2. HARDWARE-BOUND KEYSTORE & LOCAL VAULT */}
        <HardwareKeystoreCard />

        {/* 3. EMERGENCY VAULT RECOVERY KEY */}
        <EmergencyVaultRecoveryCard
          recoveryKey={securitySettings.recoveryKey}
          showRecoveryKey={showRecoveryKey}
          copiedRecovery={copiedRecovery}
          setShowRecoveryKey={setShowRecoveryKey}
          onCopyRecoveryKey={handleCopyRecoveryKey}
        />

        {/* 4. ACTIVE SESSIONS & DEVICE AUDIT */}
        <ActiveSessionsDeviceCard
          onRevokeAllOther={() => showToast('All background secondary token sessions revoked 🔒')}
          onDisconnectMobileRelay={() => showToast('Disconnected mobile relay session')}
        />
      </div>
    </div>
  );
};
