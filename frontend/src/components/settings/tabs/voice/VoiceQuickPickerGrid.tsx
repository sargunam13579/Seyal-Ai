import React from 'react';
import { Sparkles, Check, Play } from 'lucide-react';
import type { VoicePreset } from './types';

interface VoiceQuickPickerGridProps {
  activeCategory: 'all' | 'tamil' | 'global' | 'indian';
  setActiveCategory: (cat: 'all' | 'tamil' | 'global' | 'indian') => void;
  filteredVoices: VoicePreset[];
  selectedVoiceName: string;
  onSelectVoice: (voiceId: string) => void;
  onTogglePlaySample: (voice: VoicePreset) => void;
}

export const VoiceQuickPickerGrid: React.FC<VoiceQuickPickerGridProps> = ({
  activeCategory,
  setActiveCategory,
  filteredVoices,
  selectedVoiceName,
  onSelectVoice,
  onTogglePlaySample,
}) => {
  return (
    <>
      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 rounded-xl bg-slate-900/70 border border-slate-800/80">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
            activeCategory === 'all'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          🌟 All Studio Voices (8)
        </button>
        <button
          onClick={() => setActiveCategory('tamil')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
            activeCategory === 'tamil'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          🇮🇳 Tamil Masters (Pallavi, Valluvar)
        </button>
        <button
          onClick={() => setActiveCategory('global')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
            activeCategory === 'global'
              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          🌐 Multilingual Global (Breeze, Andrew, etc.)
        </button>
        <button
          onClick={() => setActiveCategory('indian')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
            activeCategory === 'indian'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          🎙️ Indian English (Neerja, Prabhat)
        </button>
      </div>

      {/* Quick Voice Picker Grid */}
      <div className="w-full space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Quick Voice Select Grid
          </span>
          <span className="text-[11px] text-slate-500 font-normal">Click to switch immediately</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {filteredVoices.map((v) => {
            const isSelected = v.id === selectedVoiceName;
            return (
              <div
                key={v.id}
                onClick={() => onSelectVoice(v.id)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                  isSelected
                    ? 'bg-cyan-950/40 border-cyan-500/60 shadow-md shadow-cyan-950/30'
                    : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-start justify-between gap-1 mb-1.5">
                  <span className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 transition-colors">
                    {v.name}
                  </span>
                  {isSelected && (
                    <span className="p-0.5 rounded-full bg-cyan-500/20 text-cyan-400">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 line-clamp-1">{v.locale}</span>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/60">
                  <span className="text-[9px] font-mono text-slate-500 uppercase">{v.gender}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePlaySample(v);
                    }}
                    className="p-1 rounded bg-slate-800 hover:bg-cyan-600 text-slate-300 hover:text-white transition-colors"
                    title="Play sample"
                  >
                    <Play className="w-3 h-3 fill-current" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};
