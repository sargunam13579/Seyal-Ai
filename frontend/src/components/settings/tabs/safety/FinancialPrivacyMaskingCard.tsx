import React from 'react';
import { CreditCard, Key } from 'lucide-react';
import type { SafetySettings } from './types';

interface FinancialPrivacyMaskingCardProps {
  safetySettings: SafetySettings;
  updateSafetySetting: <K extends keyof SafetySettings>(key: K, val: SafetySettings[K]) => void;
  renderToggle: (checked: boolean, onChange: (val: boolean) => void) => React.ReactNode;
}

export const FinancialPrivacyMaskingCard: React.FC<FinancialPrivacyMaskingCardProps> = ({
  safetySettings,
  updateSafetySetting,
  renderToggle,
}) => {
  return (
    <>
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
    </>
  );
};
