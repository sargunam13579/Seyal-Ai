import React from 'react';
import { Bot, Check } from 'lucide-react';
import { TONE_PRESETS } from './types';
import type { PersonalizationConfig } from './types';

interface CommunicationToneCardProps {
  currentTone: PersonalizationConfig['communicationTone'];
  onSelectTone: (tone: PersonalizationConfig['communicationTone']) => void;
}

export const CommunicationToneCard: React.FC<CommunicationToneCardProps> = ({
  currentTone,
  onSelectTone,
}) => {
  return (
    <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">AI Communication Tone & Persona</h3>
            <p className="text-[11px] text-slate-400">
              Select the personality and phrasing style Seyal AI uses during voice and text interactions
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {TONE_PRESETS.map((t) => {
          const isSelected = currentTone === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelectTone(t.id as any)}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                isSelected
                  ? 'bg-cyan-500/15 border-cyan-500/60 text-white shadow-sm shadow-cyan-500/20'
                  : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <span className="text-base">{t.icon}</span>
                    <span>{t.name}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                </div>
                <span className="text-[10px] font-semibold text-cyan-400/90 block">{t.tag}</span>
                <p className="text-[10px] text-slate-400 leading-relaxed mt-1">{t.desc}</p>
              </div>

              <span
                className={`text-[9px] font-mono px-2 py-0.5 rounded w-fit ${
                  isSelected
                    ? 'bg-cyan-500/30 text-cyan-200 font-bold'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {isSelected ? 'Active Tone' : 'Select'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
