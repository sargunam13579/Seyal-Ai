import React from 'react';
import { Sliders } from 'lucide-react';

interface SamplingHyperparametersCardProps {
  temperature: number;
  maxTokens: number;
  reasoningEffort: 'low' | 'medium' | 'high';
  setTemperature: (val: number) => void;
  setMaxTokens: (val: number) => void;
  setReasoningEffort: (val: 'low' | 'medium' | 'high') => void;
}

export const SamplingHyperparametersCard: React.FC<SamplingHyperparametersCardProps> = ({
  temperature,
  maxTokens,
  reasoningEffort,
  setTemperature,
  setMaxTokens,
  setReasoningEffort,
}) => {
  return (
    <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Sampling & Reasoning Parameters</h3>
            <p className="text-[11px] text-slate-400">Fine-tune determinism and maximum response lengths</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Temperature Slider */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200">Temperature</span>
            <span className="font-mono text-cyan-300 font-bold">{temperature.toFixed(2)}</span>
          </div>
          <p className="text-[10px] text-slate-400">
            {temperature <= 0.3 ? 'Deterministic (Ideal for coding & OS commands)' : 'Creative & Conversational'}
          </p>
          <input
            type="range"
            min="0.0"
            max="1.0"
            step="0.05"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>

        {/* Max Output Tokens */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200">Max Output Length</span>
            <span className="font-mono text-cyan-300 font-bold">{maxTokens} Tokens</span>
          </div>
          <p className="text-[10px] text-slate-400">
            Upper limit on generated code length per turn.
          </p>
          <input
            type="range"
            min="1024"
            max="8192"
            step="512"
            value={maxTokens}
            onChange={(e) => setMaxTokens(parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>

        {/* Reasoning Effort */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200">Reasoning Depth</span>
            <span className="font-mono text-cyan-300 font-bold uppercase">{reasoningEffort}</span>
          </div>
          <p className="text-[10px] text-slate-400">
            Depth of internal step-by-step thinking scratchpad.
          </p>
          <div className="grid grid-cols-3 gap-1 pt-1">
            {(['low', 'medium', 'high'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReasoningEffort(r)}
                className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                  reasoningEffort === r
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
