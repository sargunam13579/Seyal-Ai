import React from 'react';
import { Sparkles } from 'lucide-react';
import type { ModelProviderConfig } from './types';

interface PrimaryModelDispatcherCardProps {
  activePrimaryProvider: string;
  providers: ModelProviderConfig[];
  onSelectPrimaryProvider: (provId: string) => void;
}

export const PrimaryModelDispatcherCard: React.FC<PrimaryModelDispatcherCardProps> = ({
  activePrimaryProvider,
  providers,
  onSelectPrimaryProvider,
}) => {
  return (
    <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-950/40 via-slate-900/90 to-slate-900/90 border-2 border-cyan-500/40 shadow-lg space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            Active Reasoning Dispatcher
          </span>
          <h3 className="text-lg font-bold text-white mt-1 flex items-center gap-2">
            <span>Default Autonomous Brain</span>
            <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
          </h3>
          <p className="text-xs text-slate-300 mt-0.5">
            The primary model used to orchestrate computer-use, write code, and respond to conversation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={activePrimaryProvider}
            onChange={(e) => onSelectPrimaryProvider(e.target.value)}
            className="bg-slate-950 border border-cyan-500/50 text-xs font-semibold text-cyan-200 rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
          >
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
