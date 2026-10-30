import React from 'react';
import { Sliders } from 'lucide-react';

interface CacheQuotaThresholdCardProps {
  maxCacheLimitMb: number;
  onUpdateLimit: (val: number) => void;
}

export const CacheQuotaThresholdCard: React.FC<CacheQuotaThresholdCardProps> = ({
  maxCacheLimitMb,
  onUpdateLimit,
}) => {
  return (
    <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-sm space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-200 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-teal-400" />
          Maximum Temporary Cache Limit Quota
        </span>
        <span className="font-mono text-teal-300 font-bold bg-teal-950/60 px-2.5 py-0.5 rounded border border-teal-500/30">
          {maxCacheLimitMb} MB Limit
        </span>
      </div>
      <p className="text-[11px] text-slate-400">
        When total temporary snapshots and audio buffers exceed this threshold, the oldest cache is automatically pruned to prevent disk saturation.
      </p>

      <div className="flex items-center gap-3 pt-1">
        <span className="text-[10px] text-slate-500 font-mono">100 MB</span>
        <input
          type="range"
          min="100"
          max="2000"
          step="50"
          value={maxCacheLimitMb}
          onChange={(e) => onUpdateLimit(parseInt(e.target.value, 10))}
          className="flex-1 h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-teal-400"
        />
        <span className="text-[10px] text-slate-500 font-mono">2000 MB (2 GB)</span>
      </div>

      <div className="flex flex-wrap gap-1.5 pt-1">
        <span className="text-[10px] text-slate-500 self-center mr-1">Presets:</span>
        {[250, 500, 1000, 1500].map((mb) => (
          <button
            key={mb}
            type="button"
            onClick={() => onUpdateLimit(mb)}
            className={`px-2.5 py-0.5 rounded text-[10px] font-mono transition-all ${
              maxCacheLimitMb === mb
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 font-bold'
                : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
            }`}
          >
            {mb} MB
          </button>
        ))}
      </div>
    </div>
  );
};
