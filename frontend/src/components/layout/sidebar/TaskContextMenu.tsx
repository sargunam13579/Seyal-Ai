import React from 'react';
import { createPortal } from 'react-dom';
import {
  Info,
  Edit2,
  Pin,
  CheckSquare,
  Trash2,
} from 'lucide-react';
import type { ConversationSummary } from '../../../types';

export interface TaskContextMenuProps {
  activeMenu: {
    conv: ConversationSummary;
    isPinned: boolean;
    style: React.CSSProperties;
  } | null;
  menuRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
  onOpenInfo: (conv: ConversationSummary) => void;
  onStartRename: (conv: ConversationSummary, e: React.MouseEvent) => void;
  onTogglePin: (convId: string, e: React.MouseEvent) => void;
  onEnterSelectMode: (convId: string, e: React.MouseEvent) => void;
  onDelete: (convId: string, e: React.MouseEvent) => void;
}

export const TaskContextMenu: React.FC<TaskContextMenuProps> = ({
  activeMenu,
  menuRef,
  onClose,
  onOpenInfo,
  onStartRename,
  onTogglePin,
  onEnterSelectMode,
  onDelete,
}) => {
  if (!activeMenu || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={menuRef}
      style={activeMenu.style}
      className="rounded-2xl bg-slate-900/98 border border-slate-700/80 shadow-2xl p-1 text-xs animate-fadeIn backdrop-blur-2xl ring-1 ring-cyan-500/20 select-none"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onOpenInfo(activeMenu.conv);
          onClose();
        }}
        className="w-full px-3 py-2 rounded-xl flex items-center gap-2 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-left cursor-pointer"
      >
        <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <span>Info</span>
      </button>

      <button
        onClick={(e) => {
          onStartRename(activeMenu.conv, e);
          onClose();
        }}
        className="w-full px-3 py-2 rounded-xl flex items-center gap-2 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-left cursor-pointer"
      >
        <Edit2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <span>Rename</span>
      </button>

      <button
        onClick={(e) => {
          onTogglePin(activeMenu.conv.id, e);
          onClose();
        }}
        className="w-full px-3 py-2 rounded-xl flex items-center gap-2 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-left cursor-pointer"
      >
        <Pin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span>{activeMenu.isPinned ? 'Unpin' : 'Pin Task'}</span>
      </button>

      <button
        onClick={(e) => {
          onEnterSelectMode(activeMenu.conv.id, e);
          onClose();
        }}
        className="w-full px-3 py-2 rounded-xl flex items-center gap-2 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-left cursor-pointer"
      >
        <CheckSquare className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
        <span>Select</span>
      </button>

      <div className="border-t border-slate-800 my-1" />

      <button
        onClick={(e) => {
          onDelete(activeMenu.conv.id, e);
          onClose();
        }}
        className="w-full px-3 py-2 rounded-xl flex items-center gap-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 transition-colors text-left cursor-pointer"
      >
        <Trash2 className="w-3.5 h-3.5 shrink-0" />
        <span>Delete</span>
      </button>
    </div>,
    document.body
  );
};
