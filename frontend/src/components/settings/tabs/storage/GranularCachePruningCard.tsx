import React from 'react';
import { Trash2, Camera, Volume2, FileText, Database } from 'lucide-react';

interface GranularCachePruningCardProps {
  visionSize: number;
  audioSize: number;
  logsSize: number;
  isCleaningStorage: boolean;
  onCleanTempStorage: (type: 'vision' | 'audio' | 'logs' | 'vacuum' | 'all') => void;
}

export const GranularCachePruningCard: React.FC<GranularCachePruningCardProps> = ({
  visionSize,
  audioSize,
  logsSize,
  isCleaningStorage,
  onCleanTempStorage,
}) => {
  return (
    <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-300 border border-teal-500/20">
            <Trash2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Granular Cache Pruning & Compaction</h3>
            <p className="text-[11px] text-slate-400">Target individual media caches without affecting conversation memory</p>
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        {/* Clear Vision */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <div className="text-slate-200 font-semibold">Vision & Screenshot OCR Frames</div>
              <div className="text-[11px] text-slate-500">Autonomous desktop captures • Current size: {visionSize.toFixed(1)} MB</div>
            </div>
          </div>
          <button
            type="button"
            disabled={isCleaningStorage || visionSize === 0}
            onClick={() => onCleanTempStorage('vision')}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-medium transition-all disabled:opacity-40"
          >
            Clear Snapshots
          </button>
        </div>

        {/* Clear Audio */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Volume2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-slate-200 font-semibold">Neural Audio Synthesizer Cache</div>
              <div className="text-[11px] text-slate-500">Temporary WAV audio synthesis buffers • Current size: {audioSize.toFixed(1)} MB</div>
            </div>
          </div>
          <button
            type="button"
            disabled={isCleaningStorage || audioSize === 0}
            onClick={() => onCleanTempStorage('audio')}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-medium transition-all disabled:opacity-40"
          >
            Purge Audio
          </button>
        </div>

        {/* Truncate Logs */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="text-slate-200 font-semibold">Task Execution Traces & Telemetry</div>
              <div className="text-[11px] text-slate-500">Sub-agent log files and step traces • Current size: {logsSize.toFixed(1)} MB</div>
            </div>
          </div>
          <button
            type="button"
            disabled={isCleaningStorage}
            onClick={() => onCleanTempStorage('logs')}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-medium transition-all"
          >
            Truncate Logs
          </button>
        </div>

        {/* Vacuum Database */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="text-slate-200 font-semibold">Database Vacuum & Index Compaction</div>
              <div className="text-[11px] text-slate-400">Reorganize and compact SQLite and ChromaDB files for peak search speed</div>
            </div>
          </div>
          <button
            type="button"
            disabled={isCleaningStorage}
            onClick={() => onCleanTempStorage('vacuum')}
            className="px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/35 border border-cyan-500/40 text-cyan-200 font-semibold transition-all"
          >
            Vacuum DB
          </button>
        </div>
      </div>
    </div>
  );
};
