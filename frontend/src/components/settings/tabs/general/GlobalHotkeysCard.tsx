import React from 'react';
import { Keyboard, RotateCcw, Check } from 'lucide-react';
import type { HotkeyItem } from './types';

interface GlobalHotkeysCardProps {
  shortcuts: HotkeyItem[];
  recordingId: string | null;
  setRecordingId: (id: string | null) => void;
  shortcutToast: string | null;
  setShortcutToast: (msg: string | null) => void;
  onResetShortcuts: () => void;
}

export const GlobalHotkeysCard: React.FC<GlobalHotkeysCardProps> = ({
  shortcuts,
  recordingId,
  setRecordingId,
  shortcutToast,
  setShortcutToast,
  onResetShortcuts,
}) => {
  return (
    <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
            <Keyboard className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Keyboard Shortcuts & Hotkeys</h3>
            <p className="text-[11px] text-slate-400">
              Global and in-app key combinations for lightning-fast voice, vision, and agent control
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onResetShortcuts}
          className="text-[10px] font-mono px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 border border-slate-700 transition-all flex items-center gap-1 cursor-pointer"
        >
          <RotateCcw className="w-3 h-3 text-slate-400" />
          Reset Defaults
        </button>
      </div>

      {shortcutToast && (
        <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2 animate-fadeIn">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          {shortcutToast}
        </div>
      )}

      {/* Shortcuts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {shortcuts.map((sc) => {
          const isRecording = recordingId === sc.id;
          return (
            <div
              key={sc.id}
              className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all flex items-center justify-between gap-3"
            >
              <div className="min-w-0 space-y-0.5">
                <div className="text-xs font-semibold text-slate-200 truncate">{sc.name}</div>
                <div className="text-[11px] text-slate-400 line-clamp-1">{sc.description}</div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {sc.keys.map((k, kIdx) => (
                  <React.Fragment key={kIdx}>
                    {kIdx > 0 && <span className="text-slate-600 text-xs font-mono">+</span>}
                    <kbd className="px-2 py-1 rounded bg-slate-900 border border-slate-700 font-mono text-[11px] font-semibold text-cyan-300 shadow-sm">
                      {k}
                    </kbd>
                  </React.Fragment>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    if (isRecording) {
                      setRecordingId(null);
                    } else {
                      setRecordingId(sc.id);
                      setShortcutToast(`Recording mode for "${sc.name}" (Press Esc to cancel)`);
                      setTimeout(() => setShortcutToast(null), 3000);
                    }
                  }}
                  className={`ml-1 text-[10px] px-2 py-1 rounded border transition-all cursor-pointer ${
                    isRecording
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border-slate-700/60'
                  }`}
                  title="Edit keybinding"
                >
                  {isRecording ? 'Listening...' : 'Edit'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
