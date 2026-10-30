import React from 'react';
import { Sparkles } from 'lucide-react';

interface StorageDistributionBarProps {
  totalUsedMb: string;
  maxCacheLimitMb: number;
  visionSize: number;
  vectorSize: number;
  audioSize: number;
  logsSize: number;
  pVision: string;
  pVector: string;
  pAudio: string;
  pLogs: string;
}

export const StorageDistributionBar: React.FC<StorageDistributionBarProps> = ({
  totalUsedMb,
  maxCacheLimitMb,
  visionSize,
  vectorSize,
  audioSize,
  logsSize,
  pVision,
  pVector,
  pAudio,
  pLogs,
}) => {
  return (
    <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-200 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-teal-400" />
          Disk Usage Distribution Breakdown
        </span>
        <span className="font-mono text-xs font-bold text-teal-300">
          {totalUsedMb} MB Used of {maxCacheLimitMb} MB Quota
        </span>
      </div>

      {/* Segmented Progress Bar */}
      <div className="w-full h-3 rounded-full bg-slate-950 overflow-hidden flex border border-slate-800/80 p-0.5 gap-0.5">
        <div
          className="h-full bg-amber-400 rounded-l-full transition-all duration-500"
          style={{ width: `${Math.max(2, parseFloat(pVision))}%` }}
          title={`Vision Snapshots: ${visionSize.toFixed(1)} MB (${pVision}%)`}
        />
        <div
          className="h-full bg-cyan-400 transition-all duration-500"
          style={{ width: `${Math.max(2, parseFloat(pVector))}%` }}
          title={`Vector DB: ${vectorSize.toFixed(1)} MB (${pVector}%)`}
        />
        <div
          className="h-full bg-emerald-400 transition-all duration-500"
          style={{ width: `${Math.max(2, parseFloat(pAudio))}%` }}
          title={`Audio Synthesis: ${audioSize.toFixed(1)} MB (${pAudio}%)`}
        />
        <div
          className="h-full bg-indigo-400 rounded-r-full transition-all duration-500"
          style={{ width: `${Math.max(2, parseFloat(pLogs))}%` }}
          title={`Task Logs: ${logsSize.toFixed(1)} MB (${pLogs}%)`}
        />
      </div>

      {/* Legend Items */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-amber-400 shrink-0" />
          <div>
            <span className="text-slate-300 font-medium block">Vision & OCR</span>
            <span className="text-[11px] font-mono text-slate-500">{visionSize.toFixed(1)} MB ({pVision}%)</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-cyan-400 shrink-0" />
          <div>
            <span className="text-slate-300 font-medium block">Vector Memory</span>
            <span className="text-[11px] font-mono text-slate-500">{vectorSize.toFixed(1)} MB ({pVector}%)</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-400 shrink-0" />
          <div>
            <span className="text-slate-300 font-medium block">Audio Synthesis</span>
            <span className="text-[11px] font-mono text-slate-500">{audioSize.toFixed(1)} MB ({pAudio}%)</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-indigo-400 shrink-0" />
          <div>
            <span className="text-slate-300 font-medium block">Task Logs</span>
            <span className="text-[11px] font-mono text-slate-500">{logsSize.toFixed(1)} MB ({pLogs}%)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
