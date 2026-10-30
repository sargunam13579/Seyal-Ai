import React from 'react';
import { ShieldCheck, Laptop, Mic, Eye, Database, Lock, Clock } from 'lucide-react';

export const UnlockedPrivilegesCard: React.FC = () => {
  return (
    <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-sm space-y-4">
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
  );
};
