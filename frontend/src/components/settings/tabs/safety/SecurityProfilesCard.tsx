import React from 'react';
import { Sparkles, Lock, Shield, CheckCircle2 } from 'lucide-react';

interface SecurityProfilesCardProps {
  currentProfile: 'zero_trust' | 'balanced' | 'developer';
  onApplyProfile: (profile: 'zero_trust' | 'balanced' | 'developer') => void;
}

export const SecurityProfilesCard: React.FC<SecurityProfilesCardProps> = ({
  currentProfile,
  onApplyProfile,
}) => {
  return (
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
          onClick={() => onApplyProfile('zero_trust')}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
            currentProfile === 'zero_trust'
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
              {currentProfile === 'zero_trust' && (
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
          onClick={() => onApplyProfile('balanced')}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
            currentProfile === 'balanced'
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
              {currentProfile === 'balanced' && (
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
          onClick={() => onApplyProfile('developer')}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
            currentProfile === 'developer'
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
              {currentProfile === 'developer' && (
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
  );
};
