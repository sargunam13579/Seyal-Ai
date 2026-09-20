import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useVoice } from '../../../context/VoiceContext';
import { api } from '../../../services/api';

interface VoicePreset {
  id: string;
  name: string;
  description: string;
  gender: 'Female' | 'Male';
  locale: string;
  gradientClass: string;
}

const VOICE_PRESETS: VoicePreset[] = [
  {
    id: 'en-US-AvaMultilingualNeural',
    name: 'Breeze',
    description: 'Animated & earnest — Universal Multilingual Female',
    gender: 'Female',
    locale: 'Universal (40+ Languages)',
    gradientClass: 'from-[#5468ff] via-[#8fa5ff] to-[#ffffff]',
  },
  {
    id: 'en-US-AndrewMultilingualNeural',
    name: 'Andrew',
    description: 'Polite & warm — Universal Multilingual Male',
    gender: 'Male',
    locale: 'Universal (40+ Languages)',
    gradientClass: 'from-[#3b82f6] via-[#6366f1] to-[#cbd5e1]',
  },
  {
    id: 'en-US-EmmaMultilingualNeural',
    name: 'Emma',
    description: 'Soft & thoughtful — Universal Multilingual Female',
    gender: 'Female',
    locale: 'Universal (40+ Languages)',
    gradientClass: 'from-[#f472b6] via-[#c084fc] to-[#fdf2f8]',
  },
  {
    id: 'en-US-BrianMultilingualNeural',
    name: 'Brian',
    description: 'Crisp & expressive — Universal Multilingual Male',
    gender: 'Male',
    locale: 'Universal (40+ Languages)',
    gradientClass: 'from-[#14b8a6] via-[#0284c7] to-[#e2e8f0]',
  },
  {
    id: 'ta-IN-PallaviNeural',
    name: 'Pallavi',
    description: 'Natural & sweet — Tamil Master Female',
    gender: 'Female',
    locale: 'Tamil (India)',
    gradientClass: 'from-[#10b981] via-[#06b6d4] to-[#c7d2fe]',
  },
  {
    id: 'ta-IN-ValluvarNeural',
    name: 'Valluvar',
    description: 'Traditional & deep — Tamil Master Male',
    gender: 'Male',
    locale: 'Tamil (India)',
    gradientClass: 'from-[#64748b] via-[#3b82f6] to-[#e2e8f0]',
  },
  {
    id: 'en-IN-NeerjaNeural',
    name: 'Neerja',
    description: 'Warm & conversational — Indian English Female',
    gender: 'Female',
    locale: 'Indian English',
    gradientClass: 'from-[#ec4899] via-[#8b5cf6] to-[#fed7aa]',
  },
  {
    id: 'en-IN-PrabhatNeural',
    name: 'Prabhat',
    description: 'Articulate & clear — Indian English Male',
    gender: 'Male',
    locale: 'Indian English',
    gradientClass: 'from-[#f97316] via-[#eab308] to-[#fef08a]',
  },
];

export const VoiceTab: React.FC = () => {
  const {
    autoVoiceResponse,
    setAutoVoiceResponse,
    selectedVoiceName,
    setSelectedVoiceName,
    speechSpeed,
    setSpeechSpeed,
  } = useVoice();

  const currentVoiceIndex = Math.max(
    0,
    VOICE_PRESETS.findIndex((v) => v.id === selectedVoiceName)
  );
  const currentVoice = VOICE_PRESETS[currentVoiceIndex] || VOICE_PRESETS[0];

  const syncVoiceWithBackend = (voiceId: string) => {
    setSelectedVoiceName(voiceId);
    api.updateVoiceConfig({ tts_voice: voiceId }).catch(() => {});
  };

  const handlePrevVoice = () => {
    const nextIdx = (currentVoiceIndex - 1 + VOICE_PRESETS.length) % VOICE_PRESETS.length;
    syncVoiceWithBackend(VOICE_PRESETS[nextIdx].id);
  };

  const handleNextVoice = () => {
    const nextIdx = (currentVoiceIndex + 1) % VOICE_PRESETS.length;
    syncVoiceWithBackend(VOICE_PRESETS[nextIdx].id);
  };

  const handleSelectDot = (idx: number) => {
    syncVoiceWithBackend(VOICE_PRESETS[idx].id);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar animate-fadeIn">
      {/* Header */}
      <div className="px-8 py-4 border-b border-cyan-500/20 shrink-0 sticky top-0 bg-[#080e1d]/95 backdrop-blur-md z-40">
        <h2 className="text-base font-semibold text-slate-100">Voice</h2>
      </div>

      {/* Central Voice Carousel */}
      <div className="flex-1 flex flex-col items-center px-8 sm:px-12 pt-6 pb-8 w-full max-w-4xl mx-auto">
        {/* Glowing Voice Orb */}
        <div className="relative flex items-center justify-center mb-4">
          <div
            className={`absolute w-32 h-32 rounded-full bg-gradient-to-tr ${currentVoice.gradientClass} opacity-40 blur-2xl transition-all duration-700`}
          />
          <div
            className={`relative w-28 h-28 rounded-full bg-gradient-to-tr ${currentVoice.gradientClass} shadow-xl shadow-cyan-950/50 flex items-center justify-center transition-all duration-700`}
          >
            <div className="w-full h-full rounded-full bg-radial from-transparent via-white/10 to-black/20" />
          </div>
        </div>

        {/* Voice Navigation */}
        <div className="flex items-center justify-center gap-6 w-full max-w-sm mb-4">
          <button
            type="button"
            onClick={handlePrevVoice}
            className="p-2 text-slate-400 hover:text-cyan-300 hover:bg-slate-800/60 rounded-full transition-all shrink-0 cursor-pointer"
            title="Previous voice"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-center min-w-[200px]">
            <h3 className="text-xl font-bold text-white tracking-wide">
              {currentVoice.name}
            </h3>
            <p className="text-xs text-slate-400 mt-1 font-normal">
              {currentVoice.description}
            </p>
          </div>

          <button
            type="button"
            onClick={handleNextVoice}
            className="p-2 text-slate-400 hover:text-cyan-300 hover:bg-slate-800/60 rounded-full transition-all shrink-0 cursor-pointer"
            title="Next voice"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Pagination Dots */}
        <div className="flex items-center justify-center gap-1.5 mb-5">
          {VOICE_PRESETS.map((v, idx) => (
            <button
              key={v.id}
              type="button"
              onClick={() => handleSelectDot(idx)}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                idx === currentVoiceIndex
                  ? 'w-2.5 bg-cyan-400 shadow-sm shadow-cyan-400/50'
                  : 'w-1.5 bg-slate-700 hover:bg-slate-500'
              }`}
              title={v.name}
            />
          ))}
        </div>

        {/* Bottom Settings Rows with dividers */}
        <div className="w-full max-w-2xl sm:max-w-3xl space-y-3.5 pt-4 border-t border-slate-800/80">
          {/* Row 1: Language Detection */}
          <div className="flex items-center justify-between text-xs py-1">
            <span className="text-slate-200 font-medium">Spoken Language</span>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                ⚡ Universal Auto-Detect (தமிழ் / Tanglish / English / Hindi)
              </span>
            </div>
          </div>

          {/* Row 2: Voice Engine */}
          <div className="flex items-center justify-between text-xs py-1 border-t border-slate-800/60 pt-3">
            <span className="text-slate-200 font-medium">Speech Synthesizer</span>
            <span className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-900 border border-slate-700/80 text-slate-300">
              Microsoft Edge Neural Studio (Real-Time)
            </span>
          </div>

          {/* Row 3: Speaking Speed */}
          <div className="flex flex-col gap-2 py-2 border-t border-slate-800/60 pt-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-200 font-medium">Speaking Speed</span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-900 text-cyan-300 border border-cyan-500/30">
                {speechSpeed.toFixed(2)}x {speechSpeed === 0.88 ? '• Natural Human' : ''}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-slate-500 font-medium">0.75x</span>
              <input
                type="range"
                min="0.75"
                max="1.25"
                step="0.01"
                value={speechSpeed}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setSpeechSpeed(val);
                  api.updateVoiceConfig({ tts_speed: val }).catch(() => {});
                }}
                className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:accent-cyan-300"
              />
              <span className="text-[10px] text-slate-500 font-medium">1.25x</span>
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-500 px-0.5">
              <span>Relaxed</span>
              <button
                type="button"
                onClick={() => {
                  setSpeechSpeed(0.88);
                  api.updateVoiceConfig({ tts_speed: 0.88 }).catch(() => {});
                }}
                className="text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
              >
                Reset to Natural (0.88x)
              </button>
              <span>Energetic</span>
            </div>
          </div>

          {/* Row 4: Auto Voice Response */}
          <div className="flex items-center justify-between text-xs py-1 border-t border-slate-800/60 pt-3 pb-2">
            <span className="text-slate-200 font-medium">Auto Voice Response</span>
            <button
              type="button"
              onClick={() => setAutoVoiceResponse(!autoVoiceResponse)}
              className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                autoVoiceResponse ? 'bg-cyan-500 justify-end' : 'bg-slate-700 justify-start'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white shadow-sm" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
