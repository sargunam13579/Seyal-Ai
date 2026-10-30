import React from 'react';
import { Cpu, RotateCcw, Sparkles, Server, Sliders, Zap } from 'lucide-react';

interface AiModelsHeaderHUDProps {
  activePrimaryModel: string;
  temperature: number;
  maxTokens: number;
  onResetDefaults: () => void;
}

export const AiModelsHeaderHUD: React.FC<AiModelsHeaderHUDProps> = ({
  activePrimaryModel,
  temperature,
  maxTokens,
  onResetDefaults,
}) => {
  return (
    <div className="px-6 sm:px-8 py-4 border-b border-cyan-500/20 shrink-0 sticky top-0 bg-[#080e1d]/95 backdrop-blur-md z-40 shadow-lg shadow-black/40">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-sm shadow-cyan-500/20">
            <Cpu className="w-5 h-5 text-cyan-400 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              AI Models & Providers
              <span className="px-2 py-0.5 text-[10px] uppercase font-mono tracking-wider font-semibold rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                Multi-Engine
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Connect frontier cloud LLMs, local offline Ollama models, and custom Bring-Your-Own-Key (BYOK) APIs.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={onResetDefaults}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-xs font-medium text-slate-300 transition-all cursor-pointer"
            title="Reset AI models configuration"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset</span>
          </button>
          <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 font-mono flex items-center gap-1.5 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            ACTIVE: {activePrimaryModel.split('-')[0].toUpperCase()}
          </span>
        </div>
      </div>

      {/* Top HUD Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3 pt-3 border-t border-slate-800/80 text-[11px]">
        <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            Primary Engine:
          </span>
          <span className="font-semibold text-cyan-300 font-mono">Claude 3.5 Sonnet</span>
        </div>

        <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-emerald-400" />
            Local Offline AI:
          </span>
          <span className="font-semibold text-emerald-300 font-mono">Ollama Ready (12ms)</span>
        </div>

        <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            Temperature:
          </span>
          <span className="font-semibold text-amber-300 font-mono">{temperature.toFixed(2)} (Coding)</span>
        </div>

        <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-blue-400" />
            Max Output:
          </span>
          <span className="font-semibold text-blue-300 font-mono">{maxTokens} Tokens</span>
        </div>
      </div>
    </div>
  );
};
