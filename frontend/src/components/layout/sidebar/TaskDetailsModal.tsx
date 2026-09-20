import React from 'react';
import { createPortal } from 'react-dom';
import {
  Info,
  X,
  Pin,
  MessageSquare,
  Clock,
  FileText,
  Copy,
  Check,
} from 'lucide-react';
import type { ConversationSummary } from '../../../types';

export interface TaskInfoDetail {
  loading: boolean;
  messageCount: number;
  startTime: string | null;
  endTime: string | null;
  durationLabel: string;
  description?: string;
}

export interface TaskDetailsModalProps {
  isOpen: boolean;
  conv: ConversationSummary | null;
  onClose: () => void;
  isPinned: boolean;
  infoDetail: TaskInfoDetail | null;
  renameHistory: string[];
  formatDateTime: (dateStr: string | null | undefined) => string;
  copiedId: boolean;
  copiedDesc: boolean;
  onCopyId: (id: string) => void;
  onCopyDesc: (desc: string) => void;
}

export const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({
  isOpen,
  conv,
  onClose,
  isPinned,
  infoDetail,
  renameHistory,
  formatDateTime,
  copiedId,
  copiedDesc,
  onCopyId,
  onCopyDesc,
}) => {
  if (!isOpen || !conv || typeof document === 'undefined') return null;

  const chatAreaTarget = document.getElementById('convo-chat-area');
  if (!chatAreaTarget) return null;

  return createPortal(
    <div
      className="absolute inset-0 bg-[#060a15]/75 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-[92%] sm:w-[82%] md:w-[72%] max-w-3xl h-[calc(100%-2.5rem)] max-h-[700px] min-h-[480px] bg-slate-900/95 border border-slate-700/80 rounded-2xl p-5 sm:p-6 shadow-2xl shadow-black/80 text-slate-100 flex flex-col justify-between relative backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 shrink-0">
          <div className="flex items-center gap-2.5 text-cyan-400 font-bold text-sm tracking-wide">
            <div className="p-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30">
              <Info className="w-4 h-4 text-cyan-400" />
            </div>
            <span>Task Information</span>
          </div>

          {/* Right Header Area: Task ID Chip to the Left of Cross Symbol */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/80 border border-slate-700/70 text-xs shadow-inner">
              <span className="text-[10px] text-slate-400 font-mono font-semibold uppercase tracking-wider">ID</span>
              <code className="font-mono text-[11px] text-slate-300 max-w-[140px] sm:max-w-[180px] md:max-w-[240px] truncate select-all">
                {conv.id}
              </code>
              <button
                onClick={() => onCopyId(conv.id)}
                className="p-1 rounded-md bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer ml-0.5"
                title="Copy Task ID"
              >
                {copiedId ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex flex-col justify-between space-y-3 my-2.5 min-h-0 overflow-y-auto custom-scrollbar pr-1 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px] font-medium mb-1">Task Title</span>
            <p className="font-semibold text-slate-200 bg-slate-800/70 p-2.5 rounded-xl border border-slate-700/70 break-words text-sm leading-relaxed">
              {(conv.summary || 'Agent Task').replace(/^\[Computer-Use\]\s*/i, '')}
            </p>
            {renameHistory && renameHistory.length > 1 && (
              <div className="mt-2 px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-start gap-2">
                <span className="text-cyan-400 font-semibold shrink-0 text-[11px]">renamed:</span>
                <span className="text-slate-300 font-mono text-[11px] leading-relaxed break-words">
                  {renameHistory.join(' -> ')}
                </span>
              </div>
            )}
          </div>

          {/* Status, Messages, and Duration on the Same Line (3 columns) */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <span className="text-slate-400 block text-[11px] font-medium mb-1">Status</span>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/70 border border-slate-700/70">
                {isPinned ? (
                  <>
                    <Pin className="w-3.5 h-3.5 text-amber-400 fill-amber-400/30 shrink-0" />
                    <span className="text-amber-300 font-medium">Pinned</span>
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-slate-300">Normal</span>
                  </>
                )}
              </div>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px] font-medium mb-1">Messages</span>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/70 border border-slate-700/70">
                <span className="font-mono text-cyan-300 font-bold text-sm">
                  {infoDetail?.messageCount ?? conv.message_count ?? 0}
                </span>
                <span className="text-slate-400">messages</span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px] font-medium mb-1">Duration</span>
              <div
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/70 border border-slate-700/70"
                title={`Start: ${formatDateTime(infoDetail?.startTime || conv.created_at)} • End: ${formatDateTime(infoDetail?.endTime || infoDetail?.startTime || conv.created_at)}`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="font-mono text-cyan-300 font-bold text-sm">
                    {infoDetail?.durationLabel || '< 1 min'}
                  </span>
                </div>
                <span className="text-slate-400 font-mono text-[10px] truncate hidden md:inline ml-1">
                  {formatDateTime(infoDetail?.startTime || conv.created_at).split(',')[0]}
                </span>
              </div>
            </div>
          </div>

          {/* Description of Total Conversation */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-1 shrink-0">
              <div className="flex items-center gap-1.5 text-slate-400">
                <FileText className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="text-[11px] font-medium">Description</span>
              </div>
              {infoDetail?.description && (
                <button
                  onClick={() => onCopyDesc(infoDetail.description || '')}
                  className="p-1 text-slate-400 hover:text-cyan-300 flex items-center gap-1 text-[10px] transition-colors cursor-pointer"
                  title="Copy Description"
                >
                  {copiedDesc ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400 text-[10px]">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span className="text-[10px]">Copy</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <div className="flex-1 min-h-[90px] p-3 rounded-xl bg-slate-800/70 border border-slate-700/70 text-slate-200 text-xs leading-relaxed overflow-y-auto whitespace-pre-line custom-scrollbar select-text font-normal">
              {infoDetail?.loading ? (
                <div className="flex items-center gap-2 text-slate-400 py-1">
                  <div className="w-3 h-3 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin shrink-0" />
                  <span className="text-xs text-slate-400">Analyzing conversation...</span>
                </div>
              ) : (
                infoDetail?.description || 'No description available for this conversation.'
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-cyan-950/60 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    chatAreaTarget
  );
};
