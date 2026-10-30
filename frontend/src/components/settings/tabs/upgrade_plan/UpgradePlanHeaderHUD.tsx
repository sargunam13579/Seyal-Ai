import React from 'react';
import { Sparkles, CheckCircle2, Download, Award, Cpu, Flame } from 'lucide-react';

interface UpgradePlanHeaderHUDProps {
  voucherMsg: string | null;
  onDownloadCertificate: () => void;
}

export const UpgradePlanHeaderHUD: React.FC<UpgradePlanHeaderHUDProps> = ({
  voucherMsg,
  onDownloadCertificate,
}) => {
  return (
    <>
      <div className="px-6 sm:px-8 py-4 border-b border-cyan-500/20 shrink-0 sticky top-0 bg-[#080e1d]/95 backdrop-blur-md z-40 shadow-lg shadow-black/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-sm shadow-cyan-500/20">
              <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Subscription & Compute Quota
                <span className="px-2 py-0.5 text-[10px] uppercase font-mono tracking-wider font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <Award className="w-3 h-3 text-emerald-400" />
                  Pro Unlocked for All
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Tiered compute allocations, autonomous privileges, and model access quotas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={onDownloadCertificate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-xs font-medium text-slate-300 hover:text-cyan-300 transition-all cursor-pointer"
              title="Download digital Pro membership credentials"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Membership Badge</span>
            </button>
            <span className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 font-mono flex items-center gap-2 shadow-sm shadow-emerald-950/40">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              PRO PLAN ACTIVE • 100% FREE
            </span>
          </div>
        </div>

        {/* Top Subscription HUD Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3 pt-3 border-t border-slate-800/80 text-[11px]">
          <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              Current Plan:
            </span>
            <span className="font-semibold text-amber-300 font-mono">PRO SOVEREIGN</span>
          </div>

          <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Billing Rate:
            </span>
            <span className="font-semibold text-emerald-400 font-mono">$0 / LIFETIME</span>
          </div>

          <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              Autonomous Speed:
            </span>
            <span className="font-semibold text-cyan-300 font-mono">UNRESTRICTED</span>
          </div>

          <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              Model Access:
            </span>
            <span className="font-semibold text-rose-300 font-mono">ALL MODELS TIER</span>
          </div>
        </div>
      </div>

      {/* Toast Notification Banner */}
      {voucherMsg && (
        <div className="mx-6 sm:mx-8 mt-4 bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs px-4 py-2.5 rounded-lg flex items-center gap-2.5 shadow-lg shadow-emerald-950/50 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{voucherMsg}</span>
        </div>
      )}
    </>
  );
};
