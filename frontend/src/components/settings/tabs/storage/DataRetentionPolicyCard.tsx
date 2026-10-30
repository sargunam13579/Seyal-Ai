import React from 'react';
import { Clock } from 'lucide-react';
import type { StorageSettings } from './types';

interface DataRetentionPolicyCardProps {
  storageSettings: StorageSettings;
  onUpdateSetting: <K extends keyof StorageSettings>(key: K, val: StorageSettings[K]) => void;
}

export const DataRetentionPolicyCard: React.FC<DataRetentionPolicyCardProps> = ({
  storageSettings,
  onUpdateSetting,
}) => {
  const renderToggle = (checked: boolean, onChange: (val: boolean) => void) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
        checked ? 'bg-teal-500 justify-end shadow-sm shadow-teal-500/50' : 'bg-slate-700 justify-start'
      }`}
    >
      <span className="w-4 h-4 rounded-full bg-white shadow-md transition-all" />
    </button>
  );

  return (
    <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Automated Data Retention & Lifecycle</h3>
            <p className="text-[11px] text-slate-400">Scheduled purging of historic agent execution records and orphaned files</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {/* Retention Window */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200">
              Task Retention Duration Window
            </span>
            <span className="text-[10px] font-mono text-teal-300 bg-teal-950/60 px-2 py-0.5 rounded border border-teal-500/30">
              {storageSettings.retentionDays} Days Active
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Completed, cancelled, and failed autonomous tasks older than this window are permanently purged.
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {[
              { label: '14 Days (Minimal)', val: 14 },
              { label: '30 Days (Standard)', val: 30 },
              { label: '60 Days (Extended)', val: 60 },
              { label: '90 Days (Quarterly)', val: 90 },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => onUpdateSetting('retentionDays', item.val)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  storageSettings.retentionDays === item.val
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 font-semibold'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Daily Midnight Clean */}
        <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-200">
              Automatic Daily Midnight Maintenance
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Execute an automated low-priority cron at 12:00 AM to collect temporary trash and vacuum local databases.
            </p>
          </div>
          {renderToggle(storageSettings.autoCleanEnabled, (val) =>
            onUpdateSetting('autoCleanEnabled', val)
          )}
        </div>

        {/* Vector DB Compression */}
        <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-200">
              Compress ChromaDB Vector Indices
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Apply zstandard compression to stored vector embeddings to save up to 40% memory space.
            </p>
          </div>
          {renderToggle(storageSettings.compressVectorDb, (val) =>
            onUpdateSetting('compressVectorDb', val)
          )}
        </div>
      </div>
    </div>
  );
};
