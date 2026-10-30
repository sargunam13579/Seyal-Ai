import React from 'react';
import { Radio, Trash2 } from 'lucide-react';
import type { NotificationHistoryItem } from './types';

interface NotificationAuditLogCardProps {
  historyItems: NotificationHistoryItem[];
  onClearHistory: () => void;
}

export const NotificationAuditLogCard: React.FC<NotificationAuditLogCardProps> = ({
  historyItems,
  onClearHistory,
}) => {
  return (
    <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-300 border border-teal-500/20">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Recent Notification History Feed</h3>
            <p className="text-[11px] text-slate-400">Event trail of past task milestones and alerts</p>
          </div>
        </div>

        {historyItems.length > 0 && (
          <button
            type="button"
            onClick={onClearHistory}
            className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 cursor-pointer transition-all"
          >
            <Trash2 className="w-3 h-3 text-slate-400" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      <div className="space-y-2">
        {historyItems.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800/60">
            No recent notifications recorded.
          </div>
        ) : (
          historyItems.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start justify-between gap-3 text-xs"
            >
              <div className="flex items-start gap-2.5">
                <span
                  className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                    item.status === 'success'
                      ? 'bg-emerald-400'
                      : item.status === 'error'
                      ? 'bg-rose-400'
                      : 'bg-cyan-400'
                  }`}
                />
                <div>
                  <div className="font-semibold text-slate-200">{item.title}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{item.detail}</div>
                </div>
              </div>
              <span className="text-[10px] text-slate-500 font-mono shrink-0">{item.timestamp}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
