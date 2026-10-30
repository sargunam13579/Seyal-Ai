import React from 'react';
import { BookOpen, Save } from 'lucide-react';

interface CustomInstructionsCardProps {
  instructionsInput: string;
  setInstructionsInput: (val: string) => void;
  isSavingInstructions: boolean;
  onSaveInstructions: () => void;
}

export const CustomInstructionsCard: React.FC<CustomInstructionsCardProps> = ({
  instructionsInput,
  setInstructionsInput,
  isSavingInstructions,
  onSaveInstructions,
}) => {
  return (
    <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Permanent Custom Instructions</h3>
            <p className="text-[11px] text-slate-400">
              Directives injected into the AI's reasoning context across every conversation and autonomous plan
            </p>
          </div>
        </div>
        <span className="text-[10px] uppercase font-mono px-2.5 py-1 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-bold">
          PROMPT DIRECTIVES
        </span>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-medium text-slate-300 flex items-center justify-between">
          <span>What should Seyal AI always keep in mind when responding or operating?</span>
          <span className="text-[10px] text-slate-500 font-mono">Auto-injected into System Prompt</span>
        </label>
        <textarea
          rows={4}
          value={instructionsInput}
          onChange={(e) => setInstructionsInput(e.target.value)}
          placeholder="e.g. Always write clean Python/TypeScript code. Speak concisely in Tamil and English. Prioritize keyboard shortcuts over mouse clicks when automating windows..."
          className="w-full bg-slate-950/70 border border-slate-700/70 focus:border-cyan-500/60 rounded-xl p-3.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 font-sans leading-relaxed"
        />

        <div className="flex justify-end pt-1">
          <button
            type="button"
            disabled={isSavingInstructions}
            onClick={onSaveInstructions}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-cyan-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSavingInstructions ? 'Saving...' : 'Save Directives'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
