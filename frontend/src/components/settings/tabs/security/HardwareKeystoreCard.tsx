import React from 'react';
import { Cpu, Lock } from 'lucide-react';

export const HardwareKeystoreCard: React.FC = () => {
  return (
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
  );
};
