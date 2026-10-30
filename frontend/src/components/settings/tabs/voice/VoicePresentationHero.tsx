import React from 'react';
import { ChevronLeft, ChevronRight, Play, Square, Volume2 } from 'lucide-react';
import type { VoicePreset } from './types';
import { VOICE_PRESETS } from './types';

interface VoicePresentationHeroProps {
  currentVoice: VoicePreset;
  currentVoiceIndex: number;
  isSpeaking: boolean;
  onPrevVoice: () => void;
  onNextVoice: () => void;
  onSelectVoice: (voiceId: string) => void;
  onTogglePlaySample: (voice: VoicePreset) => void;
}

export const VoicePresentationHero: React.FC<VoicePresentationHeroProps> = ({
  currentVoice,
  currentVoiceIndex,
  isSpeaking,
  onPrevVoice,
  onNextVoice,
  onSelectVoice,
  onTogglePlaySample,
}) => {
  return (
    <div className="w-full p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-slate-900/90 to-[#070c18]/90 border border-cyan-500/30 shadow-xl shadow-cyan-950/30 flex flex-col items-center relative overflow-hidden">
      {/* Animated Glow Wave Backdrop */}
      <div
        className={`absolute w-44 h-44 rounded-full bg-gradient-to-tr ${currentVoice.gradientClass} opacity-30 blur-3xl transition-all duration-700 pointer-events-none ${
          isSpeaking ? 'scale-125 opacity-50 animate-pulse' : ''
        }`}
      />

      {/* Central Orb with Audio Equalizer Animation */}
      <div className="relative flex items-center justify-center mb-5">
        <div
          className={`w-32 h-32 rounded-full bg-gradient-to-tr ${currentVoice.gradientClass} shadow-2xl shadow-cyan-950/60 flex items-center justify-center transition-all duration-700 relative overflow-hidden`}
        >
          <div className="absolute inset-0 rounded-full bg-radial from-transparent via-white/10 to-black/30" />

          {/* Dynamic Equalizer Waves when speaking */}
          {isSpeaking ? (
            <div className="flex items-center gap-1.5 z-10">
              <span className="w-1.5 h-8 bg-white/90 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-12 bg-white/90 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-6 bg-white/90 rounded-full animate-bounce [animation-delay:-0.4s]" />
              <span className="w-1.5 h-10 bg-white/90 rounded-full animate-bounce" />
            </div>
          ) : (
            <Volume2 className="w-10 h-10 text-white/80 z-10 drop-shadow" />
          )}
        </div>
      </div>

      {/* Voice Title and Carousel Controls */}
      <div className="flex items-center justify-center gap-4 sm:gap-6 w-full max-w-md mb-2">
        <button
          type="button"
          onClick={onPrevVoice}
          className="p-2.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80 rounded-full transition-all shrink-0 cursor-pointer border border-transparent hover:border-cyan-500/30"
          title="Previous voice"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="text-center min-w-[220px]">
          <div className="flex items-center justify-center gap-2">
            <h3 className="text-xl font-bold text-white tracking-wide">
              {currentVoice.name}
            </h3>
            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              {currentVoice.gender}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-normal line-clamp-1">
            {currentVoice.description}
          </p>
        </div>

        <button
          type="button"
          onClick={onNextVoice}
          className="p-2.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80 rounded-full transition-all shrink-0 cursor-pointer border border-transparent hover:border-cyan-500/30"
          title="Next voice"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Sample Phrase Preview Text */}
      <p className="text-xs text-cyan-200/80 italic max-w-lg text-center mt-1 mb-4 px-4 py-2 rounded-lg bg-slate-950/50 border border-slate-800/60">
        &quot;{currentVoice.samplePhrase}&quot;
      </p>

      {/* Live Preview Button */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onTogglePlaySample(currentVoice)}
          className={`inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all shadow-lg cursor-pointer ${
            isSpeaking
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/40 animate-pulse'
              : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-950/50 hover:shadow-cyan-500/20'
          }`}
        >
          {isSpeaking ? (
            <>
              <Square className="w-4 h-4 fill-current" />
              Stop Voice
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              Listen Sample Voice
            </>
          )}
        </button>
      </div>

      {/* Carousel Pagination Dots */}
      <div className="flex items-center justify-center gap-1.5 mt-5">
        {VOICE_PRESETS.map((v, idx) => (
          <button
            key={v.id}
            type="button"
            onClick={() => onSelectVoice(v.id)}
            className={`h-1.5 rounded-full transition-all cursor-pointer ${
              idx === currentVoiceIndex
                ? 'w-4 bg-cyan-400 shadow-sm shadow-cyan-400/50'
                : 'w-1.5 bg-slate-700 hover:bg-slate-500'
            }`}
            title={v.name}
          />
        ))}
      </div>
    </div>
  );
};
