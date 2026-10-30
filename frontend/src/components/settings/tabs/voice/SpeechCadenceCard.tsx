import React from 'react';
import { Volume2, RotateCcw } from 'lucide-react';
import { SPEED_PRESETS } from './types';

interface SpeechCadenceCardProps {
  speechSpeed: number;
  onSpeedChange: (speed: number) => void;
  onResetSpeed: () => void;
}

export const SpeechCadenceCard: React.FC<SpeechCadenceCardProps> = ({
  speechSpeed,
  onSpeedChange,
  onResetSpeed,
}) => {
  return (
    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-200 flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-cyan-400" />
          Speech Cadence & Speed
        </span>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950 text-cyan-300 border border-cyan-500/30">
          {speechSpeed.toFixed(2)}x {speechSpeed === 0.88 ? '• Natural Human' : ''}
        </span>
      </div>

      {/* Slider */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] text-slate-500 font-medium">0.75x</span>
        <input
          type="range"
          min="0.75"
          max="1.25"
          step="0.01"
          value={speechSpeed}
          onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
          className="flex-1 h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:accent-cyan-300"
        />
        <span className="text-[10px] text-slate-500 font-medium">1.25x</span>
      </div>

      {/* Speed Presets */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
        <div className="flex flex-wrap gap-1.5">
          {SPEED_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => onSpeedChange(p.value)}
              className={`px-2.5 py-1 text-[11px] rounded-lg border transition-all ${
                Math.abs(speechSpeed - p.value) < 0.02
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-semibold'
                  : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onResetSpeed}
          className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          Reset (0.88x)
        </button>
      </div>
    </div>
  );
};
