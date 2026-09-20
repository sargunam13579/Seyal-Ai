import React from 'react';
import {
  MessageSquare,
  Pin,
  MoreVertical,
  Check,
  Edit2,
  X,
  Info,
  Loader2,
} from 'lucide-react';
import type { ConversationSummary } from '../../../types';

export interface SidebarTaskItemProps {
  conv: ConversationSummary;
  isActive: boolean;
  isPinned: boolean;
  isMenuOpen: boolean;
  isSelected: boolean;
  isInfoViewing: boolean;
  isMultiSelectMode: boolean;
  isLimitReached: boolean;
  isDeleting: boolean;
  isBatchDeleting: boolean;
  renamingConvId: string | null;
  renameText: string;
  onRenameTextChange: (text: string) => void;
  onRenameSubmit: (convId: string) => void;
  onRenameCancel: () => void;
  onSelectConversation: (convId: string) => void;
  onToggleSelect: (convId: string) => void;
  onOpenInfoModal?: (conv: ConversationSummary) => void;
  onOpenMenu: (conv: ConversationSummary, isPinned: boolean, e: React.MouseEvent) => void;
  infoModalOpen?: boolean;
}

export const SidebarTaskItem: React.FC<SidebarTaskItemProps> = ({
  conv,
  isActive,
  isPinned,
  isMenuOpen,
  isSelected,
  isInfoViewing,
  isMultiSelectMode,
  isLimitReached,
  isDeleting,
  isBatchDeleting,
  renamingConvId,
  renameText,
  onRenameTextChange,
  onRenameSubmit,
  onRenameCancel,
  onSelectConversation,
  onToggleSelect,
  onOpenInfoModal,
  onOpenMenu,
  infoModalOpen,
}) => {
  const isRenaming = renamingConvId === conv.id;
  const displayTitle = (conv.summary || 'Agent Task').replace(/^\[Computer-Use\]\s*/i, '');
  const isLongTitle = displayTitle.length > 18;

  return (
    <div
      className={`relative w-full rounded-2xl group transition-all duration-200 border my-2 ${
        isMenuOpen ? 'z-30 ' : ''
      }${
        isLimitReached
          ? 'opacity-35 blur-[0.6px] pointer-events-none cursor-not-allowed select-none border-slate-800/60 bg-slate-900/30'
          : isDeleting
          ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/60 ring-1 ring-cyan-500/40 animate-pulse'
          : isSelected
          ? isBatchDeleting
            ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/60 ring-1 ring-cyan-500/40 shadow-md shadow-cyan-950/30 animate-pulse'
            : 'bg-cyan-500/20 text-cyan-200 border-cyan-500/60 ring-1 ring-cyan-500/40 shadow-md shadow-cyan-950/30'
          : isInfoViewing
          ? 'bg-cyan-500/20 text-cyan-100 border-cyan-400/80 ring-2 ring-cyan-400/60 shadow-lg shadow-cyan-950/40'
          : isActive
          ? 'bg-cyan-500/15 text-cyan-200 border-cyan-500/50 shadow-md shadow-cyan-950/25 ring-1 ring-cyan-500/30'
          : 'bg-slate-900/50 hover:bg-slate-900/90 border-slate-800/90 hover:border-slate-700 text-slate-300 hover:text-white shadow-sm'
      }`}
    >
      {isRenaming ? (
        /* Premium Rename Overlay — covers the full card */
        <div className="w-full p-3 rounded-2xl bg-slate-950/95 border border-cyan-500/60 ring-1 ring-cyan-500/20 shadow-lg shadow-cyan-950/40 animate-fadeIn">
          {/* Header row */}
          <div className="flex items-center gap-1.5 mb-2.5">
            <Edit2 className="w-3 h-3 text-cyan-400 shrink-0" />
            <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase">Rename Chat</span>
          </div>
          {/* Input */}
          <input
            type="text"
            value={renameText}
            onChange={(e) => onRenameTextChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onRenameSubmit(conv.id);
              if (e.key === 'Escape') onRenameCancel();
            }}
            autoFocus
            placeholder="Enter new name..."
            className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition-all mb-2.5"
          />
          {/* Action buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onRenameSubmit(conv.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-500/50 text-cyan-300 hover:text-cyan-200 text-[10px] font-semibold tracking-wide transition-all cursor-pointer"
            >
              <Check className="w-3 h-3" />
              Save
            </button>
            <button
              onClick={onRenameCancel}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 text-[10px] font-semibold tracking-wide transition-all cursor-pointer"
            >
              <X className="w-3 h-3" />
              Cancel
            </button>
          </div>
          <p className="text-[9px] text-slate-600 text-center mt-1.5 font-mono">Enter to save • Esc to cancel</p>
        </div>
      ) : (
        /* Normal Task Card */
        <div
          onClick={() => {
            if (isBatchDeleting || isDeleting) return;
            if (isMultiSelectMode) {
              if (isLimitReached) return;
              onToggleSelect(conv.id);
            } else if (infoModalOpen && onOpenInfoModal) {
              onOpenInfoModal(conv);
            } else {
              onSelectConversation(conv.id);
            }
          }}
          className={`flex items-center justify-between p-3 px-3.5 cursor-pointer w-full transition-all ${
            isDeleting || isSelected ? 'bg-cyan-500/10' : ''
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-1.5 overflow-hidden">
            {isMultiSelectMode ? (
              <div
                className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                  isSelected
                    ? 'bg-cyan-400 border-cyan-400 text-slate-950 shadow-sm shadow-cyan-400/50'
                    : isLimitReached
                    ? 'border-slate-700 bg-slate-900/40 opacity-40 cursor-not-allowed'
                    : 'border-slate-600 bg-slate-900/60 hover:border-cyan-400'
                }`}
              >
                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            ) : isInfoViewing ? (
              <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 animate-pulse" />
            ) : isPinned ? (
              <Pin className="w-3.5 h-3.5 text-cyan-400 shrink-0 fill-cyan-400/40" />
            ) : (
              <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-cyan-400'}`} />
            )}

            {isActive && isLongTitle ? (
              <div className="overflow-hidden whitespace-nowrap relative flex-1 min-w-0 [mask-image:linear-gradient(to_right,black_calc(100%-14px),transparent)]">
                <div className="animate-marquee-scroll inline-flex items-center">
                  <span className="text-xs font-semibold tracking-wide text-cyan-200 pr-6">
                    {displayTitle}
                  </span>
                  <span className="text-xs font-semibold tracking-wide text-cyan-200 pr-6" aria-hidden="true">
                    {displayTitle}
                  </span>
                </div>
              </div>
            ) : (
              <span className={`truncate text-xs font-medium tracking-wide ${isActive || isSelected || isInfoViewing ? 'text-cyan-200 font-semibold' : ''}`}>
                {displayTitle}
              </span>
            )}
          </div>

          {/* Right side deleting spinner for selected items (Batch Delete) */}
          {isMultiSelectMode && isSelected && isBatchDeleting && (
            <div className="flex items-center gap-1.5 shrink-0 pl-1.5 animate-fadeIn">
              <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
            </div>
          )}

          {/* Right side deleting spinner for single chat delete */}
          {!isMultiSelectMode && isDeleting && (
            <div className="flex items-center gap-1.5 shrink-0 pl-1.5 animate-fadeIn">
              <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
            </div>
          )}

          {/* 3-Dots Setting Button */}
          {!isMultiSelectMode && !isDeleting && (
            <div className="relative shrink-0">
              <button
                onClick={(e) => onOpenMenu(conv, isPinned, e)}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${isMenuOpen
                  ? 'bg-slate-800 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80 group-hover:opacity-100 opacity-60'
                  }`}
                title="Task options"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
