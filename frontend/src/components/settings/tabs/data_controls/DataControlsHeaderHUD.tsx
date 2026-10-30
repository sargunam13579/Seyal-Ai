import React from 'react';
import { Database, ShieldCheck, Download, EyeOff, RotateCcw, Archive } from 'lucide-react';
import type { DataControlSettings } from './types';

interface DataControlsHeaderHUDProps {
  dataControlSettings: DataControlSettings;
  isExportingData: boolean;
  exportTypeLoading: string | null;
  onResetDefaults: () => void;
  onExportMasterArchive: () => void;
}

export const DataControlsHeaderHUD: React.FC<DataControlsHeaderHUDProps> = ({
  dataControlSettings,
  isExportingData,
  exportTypeLoading,
  onResetDefaults,
  onExportMasterArchive,
}) => {
  return (
    <div className="px-6 sm:px-8 py-4 border-b border-blue-500/20 shrink-0 sticky top-0 bg-[#080e1d]/95 backdrop-blur-md z-40 shadow-lg shadow-black/40">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 shadow-sm shadow-blue-500/20">
            <Database className="w-5 h-5 text-blue-400 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              Data Controls & Privacy
              <span className="px-2 py-0.5 text-[10px] uppercase font-mono tracking-wider font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
                Zero Retention
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Export personal archives, enforce training exemptions, and granularly manage local histories.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={onResetDefaults}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-xs font-medium text-slate-300 transition-all cursor-pointer"
            title="Reset data controls to defaults"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset</span>
          </button>
          <button
            type="button"
            onClick={onExportMasterArchive}
            disabled={isExportingData}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-xs font-bold text-white shadow-md shadow-blue-950/50 border border-blue-400/40 transition-all cursor-pointer disabled:opacity-50"
            title="Download all chats, tasks, memories, and rules in 1 archive"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>{exportTypeLoading === 'master' ? 'Archiving...' : 'Export Complete Archive'}</span>
          </button>
        </div>
      </div>

      {/* Top Privacy HUD Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3 pt-3 border-t border-slate-800/80 text-[11px]">
        <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Model Training:
          </span>
          <span className="font-semibold text-emerald-300 font-mono">EXEMPT (0%)</span>
        </div>

        <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            Portability:
          </span>
          <span className="font-semibold text-cyan-300 font-mono">JSON EXPORT READY</span>
        </div>

        <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1.5">
            <EyeOff className="w-3.5 h-3.5 text-blue-400" />
            Incognito Mode:
          </span>
          <span
            className={`font-semibold font-mono ${
              dataControlSettings.ephemeralIncognitoMode ? 'text-amber-400' : 'text-slate-500'
            }`}
          >
            {dataControlSettings.ephemeralIncognitoMode ? 'ACTIVE' : 'OFF'}
          </span>
        </div>

        <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            Cloud Data Vault:
          </span>
          <span className="font-semibold text-indigo-300 font-mono">SUPABASE SYNC</span>
        </div>
      </div>
    </div>
  );
};
