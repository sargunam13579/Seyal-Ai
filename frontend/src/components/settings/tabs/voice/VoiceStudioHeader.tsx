import React from 'react';
import { Radio } from 'lucide-react';
import type { VoicePreset } from './types';

interface VoiceStudioHeaderProps {
  isSpeaking: boolean;
  currentVoice: VoicePreset;
  speechSpeed: number;
  autoVoiceResponse: boolean;
}

export const VoiceStudioHeader: React.FC<VoiceStudioHeaderProps> = ({
  isSpeaking,
  currentVoice,
  speechSpeed,
  autoVoiceResponse,
}) => {
  return (
    <div className="px-6 sm:px-8 py-4 border-b border-cyan-500/20 shrink-0 sticky top-0 bg-[#080e1d]/95 backdrop-blur-md z-40 shadow-lg shadow-black/40">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-sm shadow-cyan-500/20">
            <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              Voice & Speech Engine
              <span className="px-2 py-0.5 text-[10px] uppercase font-mono tracking-wider font-semibold rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                Neural Studio
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Configure voice identity, human cadence speed, language priority, and conversational interruption.
            </p>
          </div>
        </div>

        {/* Real-time Status Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-medium border ${
              isSpeaking
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/30'
                : 'bg-slate-900/80 text-slate-400 border-slate-700/60'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isSpeaking ? 'bg-cyan-400 animate-ping' : 'bg-slate-500'
              }`}
            />
            {isSpeaking ? 'SPEAKING LIVE' : 'VOICE ENGINE READY'}
          </span>
        </div>
      </div>

      {/* Top Mini HUD Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3 pt-3 border-t border-slate-800/80 text-[11px]">
        <div className="px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400">Selected Voice:</span>
          <span className="font-semibold text-cyan-300">{currentVoice.name}</span>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400">Gender / Type:</span>
          <span className="font-semibold text-slate-200">{currentVoice.gender} Neural</span>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400">Cadence:</span>
          <span className="font-mono font-semibold text-cyan-300">{speechSpeed.toFixed(2)}x</span>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400">Auto Response:</span>
          <span
            className={`font-semibold ${
              autoVoiceResponse ? 'text-emerald-400' : 'text-slate-500'
            }`}
          >
            {autoVoiceResponse ? 'Enabled' : 'Muted'}
          </span>
        </div>
      </div>
    </div>
  );
};
