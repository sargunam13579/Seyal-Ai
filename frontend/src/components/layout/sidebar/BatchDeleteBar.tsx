import React from 'react';
import { createPortal } from 'react-dom';
import { Trash2, Loader2, X, Check, AlertCircle } from 'lucide-react';

interface BatchDeleteBarProps {
  isMultiSelectMode: boolean;
  selectedConvIds: string[];
  isBatchDeleting: boolean;
  isDeselectState: boolean;
  top10Count: number;
  onSelectTop10: () => void;
  onBatchDelete: () => void;
  onExitSelectMode: () => void;
  deleteToast: { message: string; isError?: boolean } | null;
}

export const BatchDeleteBar: React.FC<BatchDeleteBarProps> = ({
  isMultiSelectMode,
  selectedConvIds,
  isBatchDeleting,
  isDeselectState,
  top10Count,
  onSelectTop10,
  onBatchDelete,
  onExitSelectMode,
  deleteToast,
}) => {
  return (
    <>
      {/* Multi-Select Action Toolbar */}
      {isMultiSelectMode && (
        <div className="mx-1.5 mt-2 p-2 rounded-xl bg-slate-900 border border-cyan-500/30 flex items-center justify-between text-xs animate-fadeIn shadow-lg shadow-cyan-950/40">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onSelectTop10}
              disabled={isBatchDeleting}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold tracking-wide transition-colors cursor-pointer disabled:opacity-50"
            >
              {isDeselectState
                ? top10Count < 10
                  ? 'Deselect All'
                  : 'Deselect 10'
                : top10Count < 10
                ? `Select All (${top10Count})`
                : 'Select 10'}
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onBatchDelete}
              disabled={selectedConvIds.length === 0 || isBatchDeleting}
              className="px-2 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/35 text-rose-300 border border-rose-500/40 text-[11px] font-semibold disabled:opacity-40 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Delete selected tasks"
            >
              {isBatchDeleting ? (
                <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
              ) : (
                <Trash2 className="w-3 h-3" />
              )}
              <span>
                {isBatchDeleting
                  ? 'Deleting...'
                  : `Delete${
                      selectedConvIds.length > 0
                        ? ` (${selectedConvIds.length})`
                        : ''
                    }`}
              </span>
            </button>
            <button
              onClick={onExitSelectMode}
              disabled={isBatchDeleting}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
              title="Cancel selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ChatGPT-style Deletion Toast Notification (Top Center, 2.5s Auto-dismiss) */}
      {deleteToast &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[999999] pointer-events-none animate-fadeIn">
            <div
              className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl border-2 backdrop-blur-2xl shadow-2xl transition-all ${
                deleteToast.isError
                  ? 'bg-rose-950/95 border-rose-500 text-white shadow-[0_8px_30px_rgba(244,63,94,0.45)] ring-2 ring-rose-500/40'
                  : 'bg-[#0b1b36] border-cyan-400 text-white shadow-[0_8px_30px_rgba(0,240,255,0.45)] ring-2 ring-cyan-400/40'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                  deleteToast.isError
                    ? 'bg-rose-500 text-white shadow-rose-500/50'
                    : 'bg-cyan-400 text-slate-950 shadow-cyan-400/50'
                }`}
              >
                {deleteToast.isError ? (
                  <AlertCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                ) : (
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                )}
              </div>
              <span className="text-sm font-bold text-white tracking-wide drop-shadow-md">
                {deleteToast.message}
              </span>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
