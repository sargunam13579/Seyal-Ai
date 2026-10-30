import React from 'react';
import { FolderOpen, Check, Copy } from 'lucide-react';

interface RuntimeDirectoryCardProps {
  storagePath: string;
  copiedPath: boolean;
  onCopyPath: () => void;
}

export const RuntimeDirectoryCard: React.FC<RuntimeDirectoryCardProps> = ({
  storagePath,
  copiedPath,
  onCopyPath,
}) => {
  return (
    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-3">
        <FolderOpen className="w-4 h-4 text-teal-400 shrink-0" />
        <div>
          <span className="font-semibold text-slate-200 block">Runtime Data Directory:</span>
          <span className="font-mono text-[11px] text-slate-400 truncate block">{storagePath}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={onCopyPath}
        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-all self-start sm:self-auto"
      >
        {copiedPath ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        <span>Copy Path</span>
      </button>
    </div>
  );
};
