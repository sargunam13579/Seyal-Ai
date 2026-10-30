import React from 'react';
import { HardDrive, RefreshCw, Trash2, Clock, Zap } from 'lucide-react';
import type { StorageSettings } from './types';

interface StorageHeaderHUDProps {
  storageSettings: StorageSettings;
  totalUsedMb: string;
  reclaimableMb: string;
  isRecalculating: boolean;
  isCleaningStorage: boolean;
  onRecalculate: () => void;
  onCleanAll: () => void;
}

export const StorageHeaderHUD: React.FC<StorageHeaderHUDProps> = ({
  storageSettings,
  totalUsedMb,
  reclaimableMb,
  isRecalculating,
  isCleaningStorage,
  onRecalculate,
  onCleanAll,
}) => {
  return (
    <div className="px-6 sm:px-8 py-4 border-b border-teal-500/20 shrink-0 sticky top-0 bg-[#080e1d]/95 backdrop-blur-md z-40 shadow-lg shadow-black/40">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400 shadow-sm shadow-teal-500/20">
            <HardDrive className="w-5 h-5 text-teal-400 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              Storage & Cache Analytics
              <span className="px-2 py-0.5 text-[10px] uppercase font-mono tracking-wider font-semibold rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/30">
                NVMe Optimized
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Disk footprint, automated 30-day purge retention, and temporary media cache pruning.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={onRecalculate}
            disabled={isRecalculating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-xs font-medium text-slate-300 hover:text-teal-300 transition-all cursor-pointer"
            title="Recalculate live disk sizes"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${isRecalculating ? 'animate-spin text-teal-400' : ''}`} />
            <span>{isRecalculating ? 'Calculating...' : 'Recalculate'}</span>
          </button>
          <button
            type="button"
            onClick={onCleanAll}
            disabled={isCleaningStorage}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-xs font-bold text-white shadow-md shadow-teal-950/50 border border-teal-400/40 transition-all cursor-pointer"
            title="Prune all temporary media caches and compress indices"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Deep Clean All ({reclaimableMb} MB)</span>
          </button>
        </div>
      </div>

      {/* Top Storage HUD Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3 pt-3 border-t border-slate-800/80 text-[11px]">
        <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-teal-400" />
            Total Footprint:
          </span>
          <span className="font-semibold text-teal-300 font-mono">{totalUsedMb} MB</span>
        </div>

        <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Trash2 className="w-3.5 h-3.5 text-amber-400" />
            Reclaimable Cache:
          </span>
          <span className="font-semibold text-amber-300 font-mono">{reclaimableMb} MB</span>
        </div>

        <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            Purge Policy:
          </span>
          <span className="font-semibold text-cyan-300 font-mono">{storageSettings.retentionDays} DAYS</span>
        </div>

        <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            Storage Health:
          </span>
          <span className="font-semibold text-emerald-300 font-mono">100% OPTIMAL</span>
        </div>
      </div>
    </div>
  );
};
