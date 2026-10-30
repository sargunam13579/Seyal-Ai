import React from 'react';
import { Globe, Activity } from 'lucide-react';

interface ConversationalModesCardProps {
  recognitionLang: string;
  setRecognitionLang: (lang: string) => void;
  bargeInEnabled: boolean;
  setBargeInEnabled: (enabled: boolean) => void;
  autoListen: boolean;
  setAutoListen: (val: boolean) => void;
  autoVoiceResponse: boolean;
  setAutoVoiceResponse: (val: boolean) => void;
  onLanguageChange: (lang: string) => void;
  onInteractionModeChange: (mode: 'hands_free' | 'push_to_talk') => void;
}

export const ConversationalModesCard: React.FC<ConversationalModesCardProps> = ({
  recognitionLang,
  setRecognitionLang,
  bargeInEnabled,
  setBargeInEnabled,
  autoListen,
  setAutoListen,
  autoVoiceResponse,
  setAutoVoiceResponse,
  onLanguageChange,
  onInteractionModeChange,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
      {/* Spoken Language Detection Mode */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2.5">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold text-slate-200">Recognition Language</span>
        </div>
        <p className="text-[11px] text-slate-400">
          Choose primary speech understanding profile for voice queries.
        </p>
        <select
          value={recognitionLang || 'auto'}
          onChange={(e) => {
            const val = e.target.value;
            setRecognitionLang(val);
            onLanguageChange(val);
          }}
          className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-700/80 text-slate-200 focus:border-cyan-500 focus:outline-none"
        >
          <option value="auto">⚡ Tanglish & English (Latin Letters / ஆங்கில எழுத்துக்கள்)</option>
          <option value="ta-IN">🇮🇳 Pure Tamil Script (தமிழ் எழுத்துக்கள் / Tamil Unicode)</option>
          <option value="en-IN">🇮🇳 Indian English (en-IN)</option>
          <option value="en-US">🌐 US English (en-US)</option>
        </select>
        <div className="text-[10px] text-cyan-400/90 font-mono flex items-center gap-1 mt-1 bg-cyan-950/40 p-1.5 rounded border border-cyan-500/20">
          <span>✦ Pesum bothum sari, send aagum bothum sari rendume same script & language-la synchronized-ah display aagum.</span>
        </div>
      </div>

      {/* Conversational Interruption (Barge-In) */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold text-slate-200">Barge-In Interruption</span>
          </div>
          <button
            type="button"
            onClick={() => setBargeInEnabled(!bargeInEnabled)}
            className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
              bargeInEnabled ? 'bg-cyan-500 justify-end' : 'bg-slate-700 justify-start'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white shadow-sm" />
          </button>
        </div>
        <p className="text-[11px] text-slate-400">
          Instantly silence Seyal AI&apos;s audio output if you speak while it is talking.
        </p>
      </div>

      {/* Interaction Mode (Push to talk vs Hands free) */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-200">Interaction Trigger</span>
          <span className="text-[10px] text-cyan-400 font-mono">
            {autoListen ? 'Hands-Free VAD' : 'Push to Talk'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setAutoListen(true);
              onInteractionModeChange('hands_free');
            }}
            className={`p-2 rounded-lg text-xs font-medium border text-center transition-all ${
              autoListen
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            Continuous VAD
          </button>
          <button
            type="button"
            onClick={() => {
              setAutoListen(false);
              onInteractionModeChange('push_to_talk');
            }}
            className={`p-2 rounded-lg text-xs font-medium border text-center transition-all ${
              !autoListen
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            Push-to-Talk (Ctrl+Space)
          </button>
        </div>
      </div>

      {/* Auto Voice Readout */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-200">Auto Voice Response</span>
          <button
            type="button"
            onClick={() => setAutoVoiceResponse(!autoVoiceResponse)}
            className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
              autoVoiceResponse ? 'bg-cyan-500 justify-end' : 'bg-slate-700 justify-start'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white shadow-sm" />
          </button>
        </div>
        <p className="text-[11px] text-slate-400">
          Automatically synthesize audio for every incoming assistant response in chat.
        </p>
      </div>
    </div>
  );
};
