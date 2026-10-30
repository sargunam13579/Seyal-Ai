import React from 'react';
import { Sparkles, CheckCircle2, Check } from 'lucide-react';

export const ActivePlanHeroCard: React.FC = () => {
  return (
    <div className="p-6 sm:p-7 rounded-2xl bg-gradient-to-br from-cyan-950/50 via-slate-900/90 to-[#0a152e] border-2 border-cyan-500/40 shadow-xl shadow-cyan-950/30 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono uppercase font-bold tracking-wider px-2.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              Active Subscription Tier
            </span>
            <span className="text-[10px] font-mono uppercase font-bold tracking-wider px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
              <Check className="w-3 h-3" />
              Early Access Free Privilege
            </span>
          </div>

          <h3 className="text-2xl font-black text-white tracking-wide flex items-center gap-2.5">
            <span>Seyal AI Pro Sovereign</span>
            <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
          </h3>

          <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
            Currently, <strong className="text-cyan-300">all users are upgraded to the Pro Plan completely free of charge</strong>. All advanced autonomous desktop computer-use, low-latency neural voice, and multimodal vision capabilities are unlocked without any billing requirements.
          </p>

          <div className="flex items-baseline gap-2 pt-1">
            <span className="text-3xl font-extrabold text-cyan-300 font-mono">$0</span>
            <span className="text-xs text-slate-400 font-medium">/ forever free for current early adopters</span>
          </div>
        </div>

        {/* Status Pill on Right */}
        <div className="flex flex-col items-start md:items-end justify-center gap-2 shrink-0">
          <div className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-semibold text-xs flex items-center gap-2 shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Current Active Plan</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            Renews: Never (Full Access Granted)
          </span>
        </div>
      </div>
    </div>
  );
};
