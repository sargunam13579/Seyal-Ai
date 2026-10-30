import React from 'react';
import { Sparkles, ExternalLink, Download } from 'lucide-react';

interface SubscriptionDataExportCardProps {
  onOpenUpgradePlan?: () => void;
  onExportProfile: () => void;
}

export const SubscriptionDataExportCard: React.FC<SubscriptionDataExportCardProps> = ({
  onOpenUpgradePlan,
  onExportProfile,
}) => {
  return (
    <>
      {/* 4. SUBSCRIPTION TIER & PLAN */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Seyal AI Desktop — Community & Pro Tier</h3>
          </div>
          <p className="text-xs text-slate-400">
            Unlimited Autonomous Laptop Workflows, Real-time Playwright Browser Control, and Local Vector Store.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenUpgradePlan}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
        >
          <span>View Plan Details</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 5. DATA OWNERSHIP & EXPORT */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-300 border border-teal-500/20">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Data Ownership & Profile Export</h3>
              <p className="text-[11px] text-slate-400">
                Your memories and profile data belong to you. Download or inspect anytime.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onExportProfile}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-teal-400" />
            <span>Export Profile JSON</span>
          </button>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          All user data, personalized memory embeddings, and agent tool privileges are securely kept in local encrypted storage (<code className="text-cyan-400 font-mono text-[11px]">~/.seyal_ai/seyal_ai.db</code>).
        </p>
      </div>
    </>
  );
};
