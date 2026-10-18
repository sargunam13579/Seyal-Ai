import React, { useState } from 'react';
import { ActivitySquare, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';
import { GlassCard } from '../common/GlassCard';
import { useSeyalAi } from '../../context/SeyalAiContext';
import type { ActivityEvent } from '../../types';

export const ActivityView: React.FC = () => {
  const { activities } = useSeyalAi();
  const [filterType, setFilterType] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState<number>(30);

  const filtered = activities.filter((act) => {
    if (filterType === 'all') return true;
    return act.type === filterType;
  });

  const displayedActivities = filtered.slice(0, visibleCount);

  const getStatusIcon = (status: ActivityEvent['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-rose-400" />;
      case 'info':
      default:
        return <Info className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-black text-xl text-white tracking-wider flex items-center gap-2">
            <ActivitySquare className="w-5 h-5 text-cyan-400" />
            SYSTEM ACTIVITY & AUDIT LOGS
          </h2>
          <p className="font-tech text-xs text-slate-400 uppercase tracking-widest mt-1">
            Real-time Telemetry, Tool Execution Records, and Security Directives
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-tech">
          {['all', 'chat', 'tool_exec', 'identity', 'security'].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                setFilterType(type);
                setVisibleCount(30);
              }}
              className={`px-3 py-1 rounded uppercase tracking-wider transition-colors ${
                filterType === type
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {type === 'tool_exec' ? 'Tools' : type}
            </button>
          ))}
        </div>
      </div>

      <GlassCard glow corners className="p-5">
        <div className="space-y-3">
          {displayedActivities.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-tech text-sm">
              No activity logged in the current operational session yet.
            </div>
          ) : (
            displayedActivities.map((act) => (
              <div
                key={act.id}
                style={{ contentVisibility: 'auto', containIntrinsicSize: '0 64px' }}
                className="p-3.5 rounded-lg bg-slate-900/70 border border-slate-800/80 flex items-start gap-3.5 transition-all hover:border-slate-700"
              >
                <div className="p-1.5 rounded bg-slate-950 border border-slate-800 shrink-0 mt-0.5">
                  {getStatusIcon(act.status)}
                </div>

                <div className="flex-1 space-y-1 overflow-hidden">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-tech font-bold text-sm text-white truncate">
                      {act.title}
                    </span>
                    <span className="font-mono text-[11px] text-slate-500 shrink-0">
                      {act.timestamp}
                    </span>
                  </div>

                  <p className="font-mono text-xs text-slate-300 whitespace-pre-wrap break-all leading-relaxed">
                    {act.detail}
                  </p>
                </div>
              </div>
            ))
          )}

          {/* Load More Button for older events */}
          {filtered.length > visibleCount && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + 30)}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-cyan-500/30 hover:border-cyan-400 text-xs font-mono text-cyan-300 hover:text-white transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
              >
                + Load older activity events ({filtered.length - visibleCount} more)
              </button>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
};
