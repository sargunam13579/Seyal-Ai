import React from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { PERMISSION_CONFIGS } from './types';

interface PermissionsFilterToolbarProps {
  activeCategory: 'all' | 'media' | 'os' | 'exec' | 'system';
  setActiveCategory: (cat: 'all' | 'media' | 'os' | 'exec' | 'system') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  showRevokeConfirm: boolean;
  setShowRevokeConfirm: (show: boolean) => void;
  onRevokeAll: () => void;
}

export const PermissionsFilterToolbar: React.FC<PermissionsFilterToolbarProps> = ({
  activeCategory,
  setActiveCategory,
  searchQuery,
  setSearchQuery,
  showRevokeConfirm,
  setShowRevokeConfirm,
  onRevokeAll,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
        {[
          { id: 'all', label: `All (${PERMISSION_CONFIGS.length})` },
          { id: 'media', label: 'Sensors (3)' },
          { id: 'os', label: 'OS & Input (5)' },
          { id: 'exec', label: 'Code & Terminal (3)' },
          { id: 'system', label: 'Storage & Devices (5)' },
        ].map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id as any)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeCategory === cat.id
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800/70'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Search Box & Revoke Button */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search scopes (e.g. terminal)..."
            className="w-full bg-slate-900/80 border border-slate-700/60 focus:border-cyan-500/60 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
          />
        </div>

        {/* Emergency Revoke All */}
        {showRevokeConfirm ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowRevokeConfirm(false)}
              className="px-2.5 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onRevokeAll}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md shadow-rose-600/30"
            >
              Block All
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowRevokeConfirm(true)}
            className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            title="Revoke all autonomous privileges"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Revoke All</span>
          </button>
        )}
      </div>
    </div>
  );
};
