import React from 'react';
import { Sparkles, EyeOff, Eye, Check, Copy } from 'lucide-react';

interface EmergencyVaultRecoveryCardProps {
  recoveryKey: string;
  showRecoveryKey: boolean;
  copiedRecovery: boolean;
  setShowRecoveryKey: (val: boolean) => void;
  onCopyRecoveryKey: () => void;
}

export const EmergencyVaultRecoveryCard: React.FC<EmergencyVaultRecoveryCardProps> = ({
  recoveryKey,
  showRecoveryKey,
  copiedRecovery,
  setShowRecoveryKey,
  onCopyRecoveryKey,
}) => {
  return (
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
            {showRecoveryKey ? recoveryKey : 'seyal-••••-••••-••••-••••'}
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
            onClick={onCopyRecoveryKey}
            className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-medium text-amber-300 transition-all flex items-center gap-1.5"
          >
            {copiedRecovery ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Copy Key</span>
          </button>
        </div>
      </div>
    </div>
  );
};
