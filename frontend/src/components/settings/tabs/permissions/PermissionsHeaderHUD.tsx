import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface PermissionsHeaderHUDProps {
  counts: {
    allowed: number;
    ask: number;
    blocked: number;
  };
}

export const PermissionsHeaderHUD: React.FC<PermissionsHeaderHUDProps> = ({ counts }) => {
  return (
    <div className="px-8 py-5 border-b border-cyan-500/20 shrink-0 sticky top-0 bg-[#080e1d]/95 backdrop-blur-md z-40 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 className="text-base font-bold text-slate-100 flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-cyan-400" />
          <span>Autonomous Capability Permissions</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Granular access scopes, confirmation guardrails, and security profiles for Seyal AI agent
        </p>
      </div>

      {/* Live Privilege Counter Badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          {counts.allowed} Allowed
        </span>
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          {counts.ask} Require Confirmation
        </span>
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 font-mono flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
          {counts.blocked} Blocked
        </span>
      </div>
    </div>
  );
};
