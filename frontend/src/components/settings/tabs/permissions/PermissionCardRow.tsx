import React from 'react';
import {
  Clock,
  Loader2,
  Check,
  HelpCircle,
  X,
  ChevronDown,
} from 'lucide-react';
import type { PermissionItemConfig } from './types';
import { formatLastAccessed } from './types';

interface PermissionCardRowProps {
  item: PermissionItemConfig;
  permData: any;
  isBusy: boolean;
  isApplyingPreset: boolean;
  isOpenDropdown: boolean;
  onToggleDropdown: () => void;
  onSetMode: (mode: 'allow' | 'ask' | 'block') => void;
}

export const PermissionCardRow: React.FC<PermissionCardRowProps> = ({
  item,
  permData,
  isBusy,
  isApplyingPreset,
  isOpenDropdown,
  onToggleDropdown,
  onSetMode,
}) => {
  const IconComponent = item.icon;
  const mode = permData?.mode || (permData?.granted ?? true ? 'allow' : 'block');
  const lastAccessedText = formatLastAccessed(permData?.last_accessed_at, permData?.last_accessed_by);

  return (
    <div
      key={item.scope}
      className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <div className="flex items-start gap-3.5 min-w-0 flex-1">
        <div className={`w-10 h-10 rounded-xl ${item.color.bg} border ${item.color.border} flex items-center justify-center ${item.color.text} shrink-0 mt-0.5`}>
          <IconComponent className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-100">{item.name}</span>
            <span
              className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                mode === 'allow'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : mode === 'ask'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
              }`}
            >
              {mode === 'allow' ? 'Allowed' : mode === 'ask' ? 'Ask Every Time' : 'Blocked'}
            </span>

            {item.riskLevel === 'high' && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono">
                HIGH RISK
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
            {item.description}
          </p>
          <div className="flex items-center gap-3 mt-2 flex-wrap text-[11px]">
            <span className="font-mono text-[10px] text-slate-500">scope: {item.scope}</span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <Clock className="w-3.5 h-3.5 text-cyan-400/80" />
              <span>
                Last accessed: <span className={permData?.last_accessed_at ? 'text-slate-200 font-medium' : 'text-slate-500'}>{lastAccessedText}</span>
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* 3-Way Mode Dropdown Selector */}
      <div className="relative shrink-0 self-start sm:self-center">
        <button
          type="button"
          disabled={isBusy || isApplyingPreset}
          onClick={onToggleDropdown}
          className={`flex items-center justify-between gap-3 px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-sm min-w-[168px] ${
            mode === 'allow'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
              : mode === 'ask'
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
              : 'bg-rose-500/15 border-rose-500/40 text-rose-300 hover:bg-rose-500/25'
          } ${isBusy ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
        >
          <div className="flex items-center gap-2">
            {isBusy ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : mode === 'allow' ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : mode === 'ask' ? (
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <X className="w-3.5 h-3.5 text-rose-400" />
            )}
            <span>{mode === 'allow' ? 'Allowed' : mode === 'ask' ? 'Ask Every Time' : 'Blocked'}</span>
          </div>

          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isOpenDropdown
                ? 'rotate-180 ' + (mode === 'allow' ? 'text-emerald-300' : mode === 'ask' ? 'text-amber-300' : 'text-rose-300')
                : 'text-slate-400'
            }`}
          />
        </button>

        {/* Dropdown Menu Popover */}
        {isOpenDropdown && (
          <div
            onMouseLeave={onToggleDropdown}
            className="absolute right-0 mt-1.5 w-48 rounded-xl bg-[#090f1d]/95 border border-slate-700/80 shadow-2xl p-1 z-50 backdrop-blur-xl space-y-0.5 animate-fadeIn"
          >
            <button
              type="button"
              onClick={() => onSetMode('allow')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                mode === 'allow'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Allowed</span>
              </div>
              {mode === 'allow' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
            </button>

            <button
              type="button"
              onClick={() => onSetMode('ask')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                mode === 'ask'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>Ask Every Time</span>
              </div>
              {mode === 'ask' && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
            </button>

            <button
              type="button"
              onClick={() => onSetMode('block')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                mode === 'block'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <X className="w-3.5 h-3.5 text-rose-400" />
                <span>Blocked</span>
              </div>
              {mode === 'block' && <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
