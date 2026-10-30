import React from 'react';
import { Search, X, ChevronLeft } from 'lucide-react';

interface SidebarSearchHeaderProps {
  showSearchInput: boolean;
  setShowSearchInput: (show: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  totalMatches: number;
  onCollapse: () => void;
}

export const SidebarSearchHeader: React.FC<SidebarSearchHeaderProps> = ({
  showSearchInput,
  setShowSearchInput,
  searchQuery,
  setSearchQuery,
  totalMatches,
  onCollapse,
}) => {
  return (
    <div className="px-1.5 shrink-0">
      {/* Toggle Collapse Arrow Row: Right-aligned above Search Symbol */}
      <div className="flex items-center justify-end px-2 pt-0.5 pb-1">
        <button
          type="button"
          onClick={onCollapse}
          className="p-1 rounded-lg bg-slate-900/60 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 border border-slate-800 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center group"
          title="Close history (<)"
        >
          <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
        </button>
      </div>

      {showSearchInput ? (
        /* Full Header Search Bar */
        <div className="h-10 flex items-center border-b border-cyan-500/30 pb-1 animate-fadeIn">
          <div className="w-full flex items-center gap-2 px-2.5 py-1.5 bg-slate-900/40 hover:bg-slate-900/60 focus-within:bg-slate-900/70 border border-cyan-500/35 focus-within:border-cyan-400 focus-within:ring-1 focus-within:ring-cyan-500/30 rounded-xl backdrop-blur-md transition-all shadow-sm shadow-cyan-950/20">
            <Search className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearchQuery('');
                  setShowSearchInput(false);
                }
              }}
              placeholder="Search agent tasks..."
              className="w-full bg-transparent text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
              autoFocus
            />
            {/* Matching Chat Count */}
            {searchQuery.trim().length > 0 && (
              <span className="text-[11px] font-mono font-semibold text-cyan-400/90 bg-cyan-950/50 px-1.5 py-0.5 rounded-md border border-cyan-500/30 shrink-0 select-none animate-fadeIn">
                {totalMatches}
              </span>
            )}

            <button
              onClick={() => {
                setSearchQuery('');
                setShowSearchInput(false);
              }}
              className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-all shrink-0 cursor-pointer"
              title="Close search (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        /* Default Header Row */
        <div className="h-10 flex items-center justify-between px-2 pt-1 pb-2 border-b border-slate-800/80 transition-all">
          <div className="flex items-center gap-2 animate-fadeIn">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f0ff] animate-pulse" />
            <span className="text-xs font-mono font-bold tracking-wider text-cyan-400 uppercase">
              AGENT HISTORY
            </span>
            <span className="text-xs font-mono text-slate-400 font-semibold">
              ({totalMatches})
            </span>
          </div>

          <button
            onClick={() => setShowSearchInput(true)}
            className="p-1.5 rounded-lg bg-slate-900/60 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 border border-slate-800 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            title="Search agent tasks"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
