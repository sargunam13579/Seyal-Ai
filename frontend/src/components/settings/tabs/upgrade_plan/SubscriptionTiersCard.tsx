import React from 'react';
import { Layers, Check } from 'lucide-react';

export const SubscriptionTiersCard: React.FC = () => {
  return (
    <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Subscription Tiers Architecture</h3>
            <p className="text-[11px] text-slate-400">Configured so users can upgrade in future billing phases while enjoying Pro right now</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Tier 1: Free Starter */}
        <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/60 opacity-75 flex flex-col justify-between space-y-3">
          <div className="space-y-1">
            <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>Starter Free</span>
              <span className="text-[10px] font-mono text-slate-500">$0 / month</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Standard chat interactions, single-turn prompts, manual tool calling.
            </p>
          </div>
          <span className="text-[10px] font-mono text-slate-500 px-3 py-1 rounded bg-slate-900 border border-slate-800 text-center">
            Base Tier
          </span>
        </div>

        {/* Tier 2: Pro Sovereign (ACTIVE FOR ALL) */}
        <div className="p-4 rounded-xl bg-cyan-950/30 border-2 border-cyan-500/60 shadow-lg shadow-cyan-950/40 flex flex-col justify-between space-y-3 relative">
          <div className="space-y-1">
            <div className="text-xs font-bold text-cyan-200 flex items-center justify-between">
              <span>Pro Sovereign</span>
              <span className="text-[10px] font-mono text-cyan-400 font-bold">$0 Free (Future $19/mo)</span>
            </div>
            <div className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-bold inline-block">
              CURRENT ACTIVE FOR ALL
            </div>
            <p className="text-[11px] text-slate-300 pt-1">
              Uncapped autonomous computer-use, neural voice, vision OCR, ChromaDB memory, and encrypted keystore.
            </p>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>Active For Your Account</span>
          </div>
        </div>

        {/* Tier 3: Enterprise Swarm */}
        <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/60 flex flex-col justify-between space-y-3">
          <div className="space-y-1">
            <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>Enterprise Swarm</span>
              <span className="text-[10px] font-mono text-purple-400">Future Tier</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Multi-machine distributed agent cluster, headless LAN runners, and high-throughput LLM pool.
            </p>
          </div>
          <span className="text-[10px] font-mono text-purple-300 px-3 py-1 rounded bg-purple-500/15 border border-purple-500/30 text-center">
            Available In Future Update
          </span>
        </div>
      </div>
    </div>
  );
};
