import React from 'react';
import {
  Sparkles,
  CheckCircle2,
  Check,
  ShieldCheck,
  Laptop,
  Mic,
  Eye,
  Database,
  Lock,
  Clock,
  Layers,
  Cpu,
} from 'lucide-react';

export const UpgradePlanTab: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar animate-fadeIn">
      {/* Header */}
      <div className="px-8 py-5 border-b border-cyan-500/20 shrink-0 sticky top-0 bg-[#080e1d]/95 backdrop-blur-md z-40 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>Upgrade Plan & Subscription</span>
            </h2>
            <p className="text-xs text-slate-400">
              Tiered compute allocations, autonomous privileges, and model capabilities
            </p>
          </div>
        </div>
        <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 font-mono flex items-center gap-2 shadow-sm shadow-emerald-950/40">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          PRO PLAN ACTIVE • 100% FREE
        </span>
      </div>

      {/* Main Content Area */}
      <div className="p-8 sm:p-10 space-y-6 w-full max-w-5xl">
        {/* 1. CURRENT ACTIVE PLAN HERO CARD */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-cyan-950/40 via-slate-900/90 to-[#0a152e] border-2 border-cyan-500/40 shadow-xl shadow-cyan-950/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono uppercase font-bold tracking-wider px-2.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  Active Subscription
                </span>
                <span className="text-[10px] font-mono uppercase font-bold tracking-wider px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Complimentary Access
                </span>
              </div>

              <h3 className="text-2xl font-black text-white tracking-wide flex items-center gap-2.5">
                <span>Seyal AI Pro Sovereign</span>
                <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
              </h3>

              <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
                All workspace operators are granted permanent, full-tier <strong className="text-cyan-300">Pro Subscription privileges completely free of charge</strong>. Enjoy uncapped autonomous computer-use, low-latency neural voice, and multimodal vision with zero restrictions.
              </p>

              <div className="flex items-baseline gap-2 pt-1">
                <span className="text-3xl font-extrabold text-cyan-300 font-mono">$0</span>
                <span className="text-xs text-slate-400 font-medium">/ forever free (Lifetime Pro)</span>
              </div>
            </div>

            {/* Status Pill on Right */}
            <div className="flex flex-col items-start md:items-end justify-center gap-2 shrink-0">
              <div className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-semibold text-xs flex items-center gap-2 shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Current Active Plan</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                Renewal: Never (Unrestricted)
              </span>
            </div>
          </div>
        </div>

        {/* 2. PRO TIER PRIVILEGES (n-row 1-column layout) */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Unlocked Pro Tier Privileges</h3>
                <p className="text-[11px] text-slate-400">All features enabled by default for your workstation at no cost</p>
              </div>
            </div>
            <span className="text-[11px] font-mono font-bold text-cyan-300">
              6 of 6 Features Unlocked
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {/* Perk 1 */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-cyan-500/30 transition-all">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                  <Laptop className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-200">
                    Uncapped Autonomous Computer Control
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Full autonomous mouse, keyboard, and application window automation without execution limits.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0 ml-3">
                PRO UNLIMITED
              </span>
            </div>

            {/* Perk 2 */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-cyan-500/30 transition-all">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                  <Mic className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-200">
                    Low-Latency Neural Voice Synthesizer
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Continuous bidirectional audio streaming, edge-TTS neural voices, Tamil & multilingual engines.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0 ml-3">
                PRO UNLIMITED
              </span>
            </div>

            {/* Perk 3 */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-cyan-500/30 transition-all">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-200">
                    Multimodal Vision & Screen OCR
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Real-time desktop awareness, window introspection, and optical character recognition for UI inspection.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0 ml-3">
                HIGH RESOLUTION
              </span>
            </div>

            {/* Perk 4 */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-cyan-500/30 transition-all">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-200">
                    Vector Memory & ChromaDB Embeddings
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Persistent conversational semantic recall with zero cloud dependence or token charges.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0 ml-3">
                LOCAL VAULT
              </span>
            </div>

            {/* Perk 5 */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-cyan-500/30 transition-all">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-200">
                    Hardware AES-256 DPAPI Vault Protection
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Enterprise-level encryption of all API tokens, session data, and credential keystores.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0 ml-3">
                HARDWARE LOCKED
              </span>
            </div>

            {/* Perk 6 */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-cyan-500/30 transition-all">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-200">
                    30-Day Task Retention & JSON Data Exports
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Automatic task pruning after 30 days plus one-click backup exports for chat logs and task audits.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0 ml-3">
                INCLUDED
              </span>
            </div>
          </div>
        </div>

        {/* 3. TIER COMPARISON (n-row 1-column layout) */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Subscription Tiers Comparison</h3>
                <p className="text-[11px] text-slate-400">All features of Pro Tier are active by default on your current installation</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {/* Tier 1: Free Starter */}
            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/60 opacity-70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs font-bold text-slate-300 flex items-center gap-2">
                  <span>Starter Edition</span>
                  <span className="text-[10px] font-mono text-slate-500">$0 / month</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Basic chat interactions, manual tool execution, single-turn prompts.
                </p>
              </div>
              <span className="text-[10px] font-mono text-slate-500 px-3 py-1 rounded bg-slate-900 border border-slate-800 shrink-0">
                Upgraded to Pro
              </span>
            </div>

            {/* Tier 2: Pro Sovereign (ACTIVE) */}
            <div className="p-4 rounded-xl bg-cyan-950/25 border-2 border-cyan-500/50 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs font-bold text-cyan-200 flex items-center gap-2">
                  <span>Pro Sovereign Edition</span>
                  <span className="text-[10px] font-mono text-cyan-400 font-bold">$0 / month (Free Plan)</span>
                  <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-bold">
                    CURRENT PLAN
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Uncapped autonomous computer-use, neural audio engine, vision OCR, vector memory, and encrypted vault.
                </p>
              </div>
              <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 shrink-0">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Active</span>
              </div>
            </div>

            {/* Tier 3: Enterprise Swarm */}
            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs font-bold text-slate-300 flex items-center gap-2">
                  <span>Enterprise Multi-Node Swarm</span>
                  <span className="text-[10px] font-mono text-purple-400">Coming Soon</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Multi-machine distributed agent cluster, headless LAN runners, and high-throughput LLM pool.
                </p>
              </div>
              <span className="text-[10px] font-mono text-purple-300 px-3 py-1 rounded bg-purple-500/15 border border-purple-500/30 shrink-0">
                Free for Pro Users Soon
              </span>
            </div>
          </div>
        </div>

        {/* 4. RESOURCE QUOTAS (n-row 1-column layout) */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Workstation Resource Quotas</h3>
                <p className="text-[11px] text-slate-400">Dedicated local compute allocations under your free Pro subscription</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 font-mono text-xs">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-300 font-medium">Autonomous Computer-Use Tasks</span>
              <span className="text-emerald-400 font-bold">Uncapped / Unlimited</span>
            </div>
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-300 font-medium">Multimodal Screen OCR & Vision Frames</span>
              <span className="text-cyan-400 font-bold">Uncapped / Unlimited</span>
            </div>
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-300 font-medium">Neural Voice Synthesis Bandwidth</span>
              <span className="text-indigo-400 font-bold">Infinite Edge Buffers</span>
            </div>
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-300 font-medium">Task Memory Retention Window</span>
              <span className="text-teal-400 font-bold">30-Day Auto Purge Cycle</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
