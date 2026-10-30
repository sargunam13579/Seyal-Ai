import React from 'react';
import { Sparkles, ShieldAlert, Shield, Zap } from 'lucide-react';

interface SecurityProfilesCardProps {
  isApplyingPreset: boolean;
  onApplyProfile: (preset: 'paranoid' | 'balanced' | 'autonomous') => void;
}

export const SecurityProfilesCard: React.FC<SecurityProfilesCardProps> = ({
  isApplyingPreset,
  onApplyProfile,
}) => {
  return (
    <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">1-Click Security Profiles</h3>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">Quick system-wide security baselines</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Zero-Trust */}
        <button
          type="button"
          disabled={isApplyingPreset}
          onClick={() => onApplyProfile('paranoid')}
          className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-amber-500/50 hover:bg-slate-900/80 text-left transition-all cursor-pointer group disabled:opacity-50"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              Zero-Trust (Paranoid)
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Maximum Safe
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
            Requires explicit confirmation prompt for every single tool and hardware sensor.
          </p>
        </button>

        {/* Balanced */}
        <button
          type="button"
          disabled={isApplyingPreset}
          onClick={() => onApplyProfile('balanced')}
          className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-cyan-500/50 hover:bg-slate-900/80 text-left transition-all cursor-pointer group disabled:opacity-50"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Balanced Operator
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Recommended
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
            Smooth natural operation; Terminal scripts, deletions, and high-risk actions prompt for approval.
          </p>
        </button>

        {/* Full Autonomous */}
        <button
          type="button"
          disabled={isApplyingPreset}
          onClick={() => onApplyProfile('autonomous')}
          className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-emerald-500/50 hover:bg-slate-900/80 text-left transition-all cursor-pointer group disabled:opacity-50"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              Full Autonomous
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Hands-Free
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
            Grants uninterrupted permission across all 16 scopes for seamless automated workflows.
          </p>
        </button>
      </div>
    </div>
  );
};
