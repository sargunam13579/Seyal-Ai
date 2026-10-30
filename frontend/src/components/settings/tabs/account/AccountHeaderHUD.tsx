import React from 'react';
import { User, ShieldCheck } from 'lucide-react';

export const AccountHeaderHUD: React.FC = () => {
  return (
    <div className="px-8 py-5 border-b border-cyan-500/20 shrink-0 sticky top-0 bg-[#080e1d]/95 backdrop-blur-md z-40 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-sm">
          <User className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <span>Account & Operator Profile</span>
          </h2>
          <p className="text-xs text-slate-400">
            Operator identity, authentication session, and multilingual AI personalization
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-mono flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          OPERATOR SECURED
        </span>
      </div>
    </div>
  );
};
