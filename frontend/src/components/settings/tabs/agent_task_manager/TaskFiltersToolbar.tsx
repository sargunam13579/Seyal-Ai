import React from 'react';
import { Search, X } from 'lucide-react';

interface TaskFiltersToolbarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  typeFilter: 'all' | 'immediate' | 'scheduled' | 'continuous' | 'conditional';
  setTypeFilter: (tf: 'all' | 'immediate' | 'scheduled' | 'continuous' | 'conditional') => void;
}

export const TaskFiltersToolbar: React.FC<TaskFiltersToolbarProps> = ({
  searchQuery,
  setSearchQuery,
  typeFilter,
  setTypeFilter,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800/80">
      {/* Instant Search Bar */}
      <div className="relative flex-1 max-w-md">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Search by task goal, plan ID, or tool..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg bg-slate-900/90 border border-slate-700/60 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Task Type Filters */}
      <div className="flex flex-wrap items-center gap-1.5">
        {[
          { id: 'all', label: 'All Types' },
          { id: 'immediate', label: '⚡ Immediate' },
          { id: 'scheduled', label: '⏰ Scheduled' },
          { id: 'continuous', label: '🔄 Continuous' },
          { id: 'conditional', label: '🔀 Conditional' },
        ].map((tf) => (
          <button
            key={tf.id}
            type="button"
            onClick={() => setTypeFilter(tf.id as any)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
              typeFilter === tf.id
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm font-semibold'
                : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            {tf.label}
          </button>
        ))}
      </div>
    </div>
  );
};
